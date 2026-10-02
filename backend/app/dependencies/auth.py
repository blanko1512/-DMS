import os
import uuid
from collections.abc import Callable

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.services.audit_service import record_audit_event


bearer_scheme = HTTPBearer(auto_error=False)


def _get_authenticated_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
    *,
    allow_authenticator_token: bool = False,
    allow_authenticator_poll_token: bool = False,
    require_registration_scope: bool = False,
) -> tuple[User, dict]:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    secret = os.getenv("JWT_SECRET_KEY")
    algorithm = os.getenv("JWT_ALGORITHM", "HS256")
    if not secret:
        raise HTTPException(status_code=503, detail="Authentication is not configured.")
    try:
        payload = jwt.decode(credentials.credentials, secret, algorithms=[algorithm])
        token_use = payload.get("token_use")
        if token_use not in (None, "access", "authenticator", "authenticator_poll"):
            raise jwt.InvalidTokenError("Invalid token purpose.")
        if token_use == "authenticator" and not allow_authenticator_token:
            raise jwt.InvalidTokenError("Authenticator token is not an access token.")
        if token_use == "authenticator_poll" and not allow_authenticator_poll_token:
            raise jwt.InvalidTokenError("Authenticator poll token is not an access token.")
        if (
            token_use == "authenticator"
            and require_registration_scope
            and payload.get("can_register") is not True
        ):
            raise HTTPException(status_code=403, detail="This session cannot register another authenticator.")
        user_id = uuid.UUID(str(payload.get("sub")))
    except (jwt.InvalidTokenError, ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = db.get(User, user_id)
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or inactive user.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user, payload


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    user, _ = _get_authenticated_user(credentials, db)
    return user


def get_authenticator_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    user, _ = _get_authenticated_user(credentials, db, allow_authenticator_token=True)
    return user


def get_authenticator_challenge_context(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> tuple[User, dict]:
    return _get_authenticated_user(
        credentials,
        db,
        allow_authenticator_token=True,
        allow_authenticator_poll_token=True,
    )


def get_authenticator_poll_context(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> tuple[User, dict]:
    user, payload = _get_authenticated_user(
        credentials,
        db,
        allow_authenticator_poll_token=True,
    )
    if payload.get("token_use") != "authenticator_poll":
        raise HTTPException(status_code=401, detail="A challenge-scoped login token is required.")
    return user, payload


def get_authenticator_registration_context(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> tuple[User, str | None]:
    user, payload = _get_authenticated_user(
        credentials,
        db,
        allow_authenticator_token=True,
        require_registration_scope=True,
    )
    if payload.get("token_use") != "authenticator":
        return user, None
    device_id = payload.get("device_id")
    if not isinstance(device_id, str) or not device_id:
        raise HTTPException(status_code=401, detail="Authenticator session has no device binding.")
    return user, device_id


def require_roles(*roles: str) -> Callable:
    allowed_roles = {role.upper() for role in roles}

    def role_dependency(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> User:
        if current_user.role.upper() not in allowed_roles:
            record_audit_event(db, current_user.id, "AUTHORIZATION_DENIED", "endpoint", None, "DENIED", {"required_roles": sorted(allowed_roles)})
            db.commit()
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions.")
        return current_user

    return role_dependency