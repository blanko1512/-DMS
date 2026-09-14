import os
import secrets
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import HTTPException, status
from pwdlib import PasswordHash
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.otp_challenge import OTPChallenge
from app.services.otp_delivery import otp_delivery
from app.services.audit_service import record_audit_event


ROLES = {"ADMIN", "INVESTIGATOR", "FORENSIC_OFFICER", "VIEWER"}
password_hasher = PasswordHash.recommended()


def normalize_role(role: str) -> str:
    normalized = role.strip().upper()
    if normalized not in ROLES:
        raise HTTPException(status_code=422, detail="Invalid role.")
    return normalized


def hash_password(password: str) -> str:
    return password_hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return password_hasher.verify(password, password_hash)
    except Exception:
        return False


def _jwt_settings() -> tuple[str, str, int]:
    secret = os.getenv("JWT_SECRET_KEY")
    if not secret:
        raise HTTPException(status_code=503, detail="Authentication is not configured.")
    algorithm = os.getenv("JWT_ALGORITHM", "HS256")
    try:
        expires_minutes = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    except ValueError as error:
        raise HTTPException(status_code=503, detail="Authentication expiration is misconfigured.") from error
    return secret, algorithm, expires_minutes


def create_access_token(user: User) -> str:
    secret, algorithm, expires_minutes = _jwt_settings()
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user.id),
        "role": user.role,
        "iat": now,
        "exp": now + timedelta(minutes=expires_minutes),
    }
    return jwt.encode(payload, secret, algorithm=algorithm)


def access_token_expiration_seconds() -> int:
    _, _, expires_minutes = _jwt_settings()
    return expires_minutes * 60


def authenticate_user(db: Session, email: str, password: str) -> User:
    user = db.query(User).filter(User.email == email.lower()).first()
    if user is None or not verify_password(password, user.password_hash):
        record_audit_event(db, user.id if user else None, "LOGIN_FAILURE", "authentication", None, "FAILED")
        db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password.")
    if not user.is_active:
        record_audit_event(db, user.id, "USER_DISABLED", "user", user.id, "DENIED")
        db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password.")
    return user


def create_login_otp_challenge(db: Session, user: User) -> OTPChallenge:
    now = datetime.now(timezone.utc)
    db.query(OTPChallenge).filter(
        OTPChallenge.user_id == user.id,
        OTPChallenge.purpose == "LOGIN",
        OTPChallenge.status == "PENDING",
    ).update({"status": "INVALIDATED"}, synchronize_session=False)
    otp = f"{secrets.randbelow(1_000_000):06d}"
    challenge = OTPChallenge(
        user_id=user.id,
        otp_hash=hash_password(otp),
        created_at=now,
        expires_at=now + timedelta(minutes=5),
        attempt_count=0,
        max_attempts=5,
        purpose="LOGIN",
        status="PENDING",
    )
    db.add(challenge)
    db.flush()
    otp_delivery.deliver(user, challenge.id, otp)
    record_audit_event(db, user.id, "OTP_REQUIRED", "otp_challenge", challenge.id, "PENDING")
    db.commit()
    db.refresh(challenge)
    return challenge


def verify_login_otp(db: Session, challenge_id, otp: str) -> tuple[User, OTPChallenge]:
    challenge = db.query(OTPChallenge).with_for_update().filter(OTPChallenge.id == challenge_id).first()
    if challenge is None or challenge.purpose != "LOGIN":
        record_audit_event(db, None, "OTP_FAILURE", "otp_challenge", challenge_id, "FAILED")
        db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid OTP.")
    now = datetime.now(timezone.utc)
    if challenge.status == "USED":
        record_audit_event(db, challenge.user_id, "OTP_REPLAY_REJECTED", "otp_challenge", challenge.id, "DENIED")
        db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="OTP already used.")
    if challenge.status != "PENDING" or challenge.attempt_count >= challenge.max_attempts:
        record_audit_event(db, challenge.user_id, "OTP_FAILURE", "otp_challenge", challenge.id, "DENIED")
        db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid OTP.")
    if challenge.expires_at <= now:
        challenge.status = "EXPIRED"
        record_audit_event(db, challenge.user_id, "OTP_EXPIRED", "otp_challenge", challenge.id, "FAILED")
        db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="OTP expired.")
    if not verify_password(otp, challenge.otp_hash):
        challenge.attempt_count += 1
        if challenge.attempt_count >= challenge.max_attempts:
            challenge.status = "INVALIDATED"
        record_audit_event(db, challenge.user_id, "OTP_FAILURE", "otp_challenge", challenge.id, "FAILED")
        db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid OTP.")
    user = db.get(User, challenge.user_id)
    if user is None or not user.is_active:
        challenge.status = "INVALIDATED"
        record_audit_event(db, challenge.user_id, "USER_DISABLED", "user", challenge.user_id, "DENIED")
        db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid OTP.")
    challenge.status = "USED"
    challenge.used_at = now
    record_audit_event(db, user.id, "OTP_SUCCESS", "otp_challenge", challenge.id, "SUCCESS")
    record_audit_event(db, user.id, "LOGIN_SUCCESS", "user", user.id, "SUCCESS")
    db.commit()
    db.refresh(challenge)
    return user, challenge