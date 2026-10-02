import os
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import get_authenticator_challenge_context, get_authenticator_poll_context, get_authenticator_registration_context, get_authenticator_user, get_current_user, require_roles
from app.models.authenticator_challenge import AuthenticatorChallenge
from app.models.authenticator_device import AuthenticatorDevice
from app.models.otp_challenge import OTPChallenge
from app.models.user import User
from app.schemas.auth import (
    AuthUserResponse,
    AuthenticatorSessionRequest,
    AuthenticatorSessionResponse,
    AuthenticatorChallengeApprovalRequest,
    AuthenticatorChallengeApprovalResponse,
    AuthenticatorChallengeStatusResponse,
    AuthenticatorDeviceRegistrationRequest,
    AuthenticatorDeviceResponse,
    AuthenticatorLoginCompletionRequest,
    AuthenticatorRequiredResponse,
    LoginChallengeResponse,
    LoginRequest,
    MobileOtpRevealRequest,
    OTPRequiredResponse,
    OTPTokenResponse,
    OTPVerifyRequest,
    PendingAuthenticatorChallengeResponse,
    RegisterRequest,
)
from app.services.audit_service import record_audit_event
from app.services.auth_service import access_token_expiration_seconds, authenticate_user, create_access_token, create_authenticator_poll_token, create_authenticator_session_token, create_login_otp_challenge, hash_password, normalize_role, verify_login_otp
from app.services.otp_delivery import development_otp_enabled, otp_delivery
from app.services.authenticator_service import (
    approve_authenticator_challenge,
    build_authenticator_challenge_payload,
    consume_authenticator_challenge,
    create_authenticator_challenge,
    list_active_devices,
    register_authenticator_device,
    revoke_authenticator_device,
    verify_authenticator_challenge_signature,
)


router = APIRouter(prefix="/api/auth", tags=["authentication"])


@router.post("/register", response_model=AuthUserResponse, status_code=status.HTTP_201_CREATED)
def register_user(request: RegisterRequest, db: Session = Depends(get_db)):
    role = normalize_role(request.role)
    allow_role_registration = os.getenv("AUTH_ALLOW_ROLE_REGISTRATION", "false").lower() == "true"
    if role != "VIEWER" and not allow_role_registration:
        raise HTTPException(status_code=403, detail="Only VIEWER registration is enabled.")
    user = User(
        name=request.name,
        email=request.email.lower(),
        password_hash=hash_password(request.password),
        role=role,
        is_active=True,
    )
    db.add(user)
    try:
        db.commit()
        db.refresh(user)
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(status_code=409, detail="An account with this email already exists.") from error
    return AuthUserResponse(user_id=user.id, username=user.email, role=user.role, is_active=user.is_active)


@router.post("/login", response_model=LoginChallengeResponse)
def login_user(request: LoginRequest, db: Session = Depends(get_db)):
    user = authenticate_user(db, request.email, request.password)
    active_devices = list_active_devices(db, user.id)

    if active_devices:
        challenge = create_authenticator_challenge(db, user.id, active_devices[0].id)
        record_audit_event(
            db,
            user.id,
            "AUTHENTICATOR_REQUIRED",
            "authenticator_challenge",
            challenge.id,
            "PENDING",
            {"device_id": str(active_devices[0].id), "challenge_type": "AUTHENTICATOR"},
        )
        record_audit_event(
            db,
            user.id,
            "LOGIN_CHALLENGE_CREATED",
            "authenticator_challenge",
            challenge.id,
            "PENDING",
            {"challenge_type": "AUTHENTICATOR"},
        )
        db.commit()
        return AuthenticatorRequiredResponse(
            status="AUTHENTICATOR_REQUIRED",
            challenge_id=challenge.id,
            message="Authenticator approval required.",
            expires_at=challenge.expires_at,
            poll_token=create_authenticator_poll_token(user, challenge.id),
        )

    challenge = create_login_otp_challenge(db, user)
    return OTPRequiredResponse(
        status="OTP_REQUIRED",
        challenge_id=challenge.id,
        message="OTP verification required.",
        dev_otp=getattr(challenge, "_dev_otp", None) if development_otp_enabled() else None,
        expires_at=challenge.expires_at,
    )


@router.post("/mobile/reveal-otp", response_model=OTPRequiredResponse)
def reveal_mobile_otp(request: MobileOtpRevealRequest, db: Session = Depends(get_db)):
    """Development-only bridge: reveal the OTP belonging to the current web login."""
    if not development_otp_enabled():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found.")
    user = authenticate_user(db, request.email, request.password)
    now = __import__("datetime").datetime.now(__import__("datetime").timezone.utc)
    challenge = (
        db.query(OTPChallenge)
        .filter(
            OTPChallenge.user_id == user.id,
            OTPChallenge.purpose == "LOGIN",
            OTPChallenge.status == "PENDING",
            OTPChallenge.expires_at > now,
        )
        .order_by(OTPChallenge.created_at.desc())
        .first()
    )
    if challenge is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Start login on the web app first.")

    otp = otp_delivery.get(challenge.id)
    if otp is None:
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="OTP is no longer available. Start web login again.")

    return OTPRequiredResponse(
        status="OTP_REQUIRED",
        challenge_id=challenge.id,
        message="OTP unlocked after mobile biometric approval.",
        dev_otp=otp,
        expires_at=challenge.expires_at,
    )


@router.post("/authenticator/session", response_model=AuthenticatorSessionResponse)
def create_mobile_authenticator_session(
    request: AuthenticatorSessionRequest,
    db: Session = Depends(get_db),
):
    user = authenticate_user(db, request.email, request.password)
    active_devices = list_active_devices(db, user.id)
    can_register = not active_devices or any(
        device.device_identifier == request.device_id for device in active_devices
    )
    return AuthenticatorSessionResponse(
        access_token=create_authenticator_session_token(
            user,
            can_register=can_register,
            device_id=request.device_id,
        ),
        can_register=can_register,
    )


@router.get("/authenticator-challenge/{challenge_id}", response_model=AuthenticatorChallengeStatusResponse)
def get_authenticator_challenge_status(
    challenge_id: uuid.UUID,
    auth_context: tuple[User, dict] = Depends(get_authenticator_challenge_context),
    db: Session = Depends(get_db),
):
    current_user, token_payload = auth_context
    if (
        token_payload.get("token_use") == "authenticator_poll"
        and token_payload.get("challenge_id") != str(challenge_id)
    ):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Poll token is bound to another challenge.")
    challenge = db.get(AuthenticatorChallenge, challenge_id)
    if challenge is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Challenge not found.")
    if challenge.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You cannot view this challenge.")
    now = datetime.now(timezone.utc)
    expires_at = challenge.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if challenge.status == "PENDING" and expires_at <= now:
        challenge.status = "EXPIRED"
        db.commit()
    return AuthenticatorChallengeStatusResponse(
        challenge_id=challenge.id,
        status=challenge.status,
        expires_at=challenge.expires_at,
    )


@router.get("/authenticator-challenges/pending", response_model=list[PendingAuthenticatorChallengeResponse])
def list_pending_authenticator_challenges(
    current_user: User = Depends(get_authenticator_user),
    db: Session = Depends(get_db),
):
    challenges = (
        db.query(AuthenticatorChallenge)
        .filter(
            AuthenticatorChallenge.user_id == current_user.id,
            AuthenticatorChallenge.status == "PENDING",
            AuthenticatorChallenge.expires_at > __import__("datetime").datetime.now(__import__("datetime").timezone.utc),
        )
        .order_by(AuthenticatorChallenge.created_at.desc())
        .all()
    )
    return [
        PendingAuthenticatorChallengeResponse(
            challenge_id=challenge.id,
            created_at=challenge.created_at,
            expires_at=challenge.expires_at,
            purpose="AUTHENTICATOR_LOGIN",
        )
        for challenge in challenges
    ]


@router.get("/authenticator-challenges/device/{device_id}", response_model=list[PendingAuthenticatorChallengeResponse])
def list_pending_authenticator_challenges_for_device(
    device_id: str,
    current_user: User = Depends(get_authenticator_user),
    db: Session = Depends(get_db),
):
    device = (
        db.query(AuthenticatorDevice)
        .filter(
            AuthenticatorDevice.device_identifier == device_id,
            AuthenticatorDevice.user_id == current_user.id,
            AuthenticatorDevice.is_active.is_(True),
            AuthenticatorDevice.revoked_at.is_(None),
        )
        .first()
    )
    if device is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Authenticator device not found.")

    now = __import__("datetime").datetime.now(__import__("datetime").timezone.utc)
    challenges = (
        db.query(AuthenticatorChallenge)
        .filter(
            AuthenticatorChallenge.authenticator_device_id == device.id,
            AuthenticatorChallenge.status == "PENDING",
            AuthenticatorChallenge.expires_at > now,
        )
        .order_by(AuthenticatorChallenge.created_at.desc())
        .all()
    )
    return [
        PendingAuthenticatorChallengeResponse(
            challenge_id=challenge.id,
            created_at=challenge.created_at,
            expires_at=challenge.expires_at,
            purpose="AUTHENTICATOR_LOGIN",
        )
        for challenge in challenges
    ]


@router.post("/verify-otp", response_model=OTPTokenResponse)
def verify_otp(request: OTPVerifyRequest, db: Session = Depends(get_db)):
    user, _ = verify_login_otp(db, request.challenge_id, request.otp)
    return OTPTokenResponse(
        access_token=create_access_token(user),
        token_type="bearer",
        expires_in=access_token_expiration_seconds(),
    )


@router.post("/authenticator/approve", response_model=AuthenticatorChallengeApprovalResponse)
def approve_authenticator_login_challenge(
    request: AuthenticatorChallengeApprovalRequest,
    current_user: User = Depends(get_authenticator_user),
    db: Session = Depends(get_db),
):
    challenge = db.get(AuthenticatorChallenge, request.challenge_id)
    if challenge is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Challenge not found.")
    if challenge.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You cannot approve this challenge.")
    if challenge.status != "PENDING":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Challenge is no longer pending.")
    if challenge.authenticator_device_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Challenge is not bound to a device.")
    expires_at = challenge.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at <= datetime.now(timezone.utc):
        challenge.status = "EXPIRED"
        db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Challenge expired.")

    device = db.get(AuthenticatorDevice, challenge.authenticator_device_id)
    if device is None or device.user_id != challenge.user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Device is unavailable.")
    if device.device_identifier != request.device_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Device identifier mismatch.")
    if device.revoked_at is not None or not device.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Device is unavailable.")
    if not device.public_key:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Device public key is not registered.")

    expected_payload = build_authenticator_challenge_payload(challenge, device_identifier=device.device_identifier)
    if request.payload != expected_payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Challenge payload mismatch.")
    if not verify_authenticator_challenge_signature(device.public_key, request.payload, request.signature):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Signature verification failed.")

    user = db.get(User, challenge.user_id)
    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User is unavailable.")

    approve_authenticator_challenge(db, user.id, challenge.id, authenticator_device_id=device.id)
    record_audit_event(
        db,
        user.id,
        "AUTHENTICATOR_LOGIN_APPROVED",
        "authenticator_challenge",
        challenge.id,
        "SUCCESS",
        {"device_id": device.device_identifier},
    )
    db.commit()
    return AuthenticatorChallengeApprovalResponse(
        status="APPROVED",
        challenge_id=challenge.id,
        message="Login approved.",
    )


@router.post("/login/complete", response_model=OTPTokenResponse)
def complete_authenticator_login_challenge(
    request: AuthenticatorLoginCompletionRequest,
    auth_context: tuple[User, dict] = Depends(get_authenticator_poll_context),
    db: Session = Depends(get_db),
):
    current_user, token_payload = auth_context
    if token_payload.get("challenge_id") != str(request.challenge_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Poll token is bound to another challenge.")
    challenge = db.get(AuthenticatorChallenge, request.challenge_id)
    if challenge is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Challenge not found.")
    if challenge.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You cannot complete this challenge.")
    if challenge.status != "APPROVED":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Challenge is not approved.")
    expires_at = challenge.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at <= datetime.now(timezone.utc):
        challenge.status = "EXPIRED"
        db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Challenge expired.")

    user = db.get(User, challenge.user_id)
    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User is unavailable.")

    consume_authenticator_challenge(db, user.id, challenge.id)
    db.commit()
    return OTPTokenResponse(
        access_token=create_access_token(user),
        token_type="bearer",
        expires_in=access_token_expiration_seconds(),
    )


@router.post("/authenticator/register", response_model=AuthenticatorDeviceResponse)
def register_authenticator_device_for_user(
    request: AuthenticatorDeviceRegistrationRequest,
    registration_context: tuple[User, str | None] = Depends(get_authenticator_registration_context),
    db: Session = Depends(get_db),
):
    current_user, scoped_device_id = registration_context
    device_identifier = request.device_id.strip()
    if not device_identifier:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Device ID is required.")
    if scoped_device_id is not None and scoped_device_id != device_identifier:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Authenticator session is bound to another device.")

    existing = (
        db.query(AuthenticatorDevice)
        .filter(AuthenticatorDevice.device_identifier == device_identifier)
        .first()
    )
    if existing is not None:
        if existing.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This device identifier is already registered to another user.",
            )
        if existing.revoked_at is not None or not existing.is_active:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This device has been revoked and cannot be reactivated.",
            )

        candidate_public_key = request.public_key.strip() if request.public_key and request.public_key.strip() else None
        if candidate_public_key and not existing.public_key:
            existing.public_key = candidate_public_key
        elif candidate_public_key and existing.public_key != candidate_public_key:
            existing.public_key = candidate_public_key

        record_audit_event(
            db,
            current_user.id,
            "AUTHENTICATOR_REGISTERED",
            "authenticator_device",
            existing.id,
            "SUCCESS",
            {"device_id": device_identifier, "public_key_present": bool(existing.public_key)},
        )
        db.commit()
        db.refresh(existing)
        return AuthenticatorDeviceResponse(
            device_id=str(existing.device_identifier),
            device_name=existing.device_name,
            public_key=existing.public_key,
            is_active=existing.is_active,
            created_at=existing.created_at,
            last_used_at=existing.last_used_at,
        )

    device = register_authenticator_device(
        db,
        current_user.id,
        device_identifier,
        request.device_name,
        public_key=request.public_key,
    )
    record_audit_event(
        db,
        current_user.id,
        "AUTHENTICATOR_REGISTERED",
        "authenticator_device",
        device.id,
        "SUCCESS",
        {"device_id": device_identifier, "public_key_present": bool(device.public_key)},
    )
    db.commit()
    return AuthenticatorDeviceResponse(
        device_id=str(device.device_identifier),
        device_name=device.device_name,
        public_key=device.public_key,
        is_active=device.is_active,
        created_at=device.created_at,
        last_used_at=device.last_used_at,
    )


@router.get("/authenticator/devices", response_model=list[AuthenticatorDeviceResponse])
def list_authenticator_devices_for_user(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    devices = (
        db.query(AuthenticatorDevice)
        .filter(AuthenticatorDevice.user_id == current_user.id)
        .order_by(AuthenticatorDevice.created_at.desc())
        .all()
    )
    return [
        AuthenticatorDeviceResponse(
            device_id=str(device.device_identifier),
            device_name=device.device_name,
            public_key=device.public_key,
            is_active=device.is_active,
            created_at=device.created_at,
            last_used_at=device.last_used_at,
        )
        for device in devices
    ]


@router.post("/authenticator/devices/{device_id}/revoke", response_model=AuthenticatorDeviceResponse)
def revoke_authenticator_device_for_user(
    device_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    device = (
        db.query(AuthenticatorDevice)
        .filter(AuthenticatorDevice.device_identifier == device_id, AuthenticatorDevice.user_id == current_user.id)
        .first()
    )
    if device is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found.")

    if device.revoked_at is not None:
        record_audit_event(
            db,
            current_user.id,
            "AUTHENTICATOR_REVOKED",
            "authenticator_device",
            device.id,
            "DENIED",
            {"device_id": device.device_identifier},
        )
        db.commit()
        return AuthenticatorDeviceResponse(
            device_id=str(device.device_identifier),
            device_name=device.device_name,
            public_key=device.public_key,
            is_active=device.is_active,
            created_at=device.created_at,
            last_used_at=device.last_used_at,
        )

    revoked = revoke_authenticator_device(db, current_user.id, device.id)
    record_audit_event(
        db,
        current_user.id,
        "AUTHENTICATOR_REVOKED",
        "authenticator_device",
        revoked.id,
        "SUCCESS",
        {"device_id": str(revoked.device_identifier)},
    )
    db.commit()
    return AuthenticatorDeviceResponse(
        device_id=str(revoked.device_identifier),
        device_name=revoked.device_name,
        is_active=revoked.is_active,
        created_at=revoked.created_at,
        last_used_at=revoked.last_used_at,
    )


@router.get("/me", response_model=AuthUserResponse)
def current_user_profile(current_user: User = Depends(get_current_user)):
    return AuthUserResponse(
        user_id=current_user.id,
        username=current_user.email,
        role=current_user.role,
        is_active=current_user.is_active,
    )


@router.get("/test/admin")
def admin_test(_: User = Depends(require_roles("ADMIN"))):
    return {"status": "ok", "role": "ADMIN"}


@router.get("/test/investigator")
def investigator_test(_: User = Depends(require_roles("INVESTIGATOR"))):
    return {"status": "ok", "role": "INVESTIGATOR"}


@router.get("/test/forensic")
def forensic_test(_: User = Depends(require_roles("FORENSIC_OFFICER"))):
    return {"status": "ok", "role": "FORENSIC_OFFICER"}


@router.get("/test/viewer")
def viewer_test(_: User = Depends(require_roles("VIEWER"))):
    return {"status": "ok", "role": "VIEWER"}