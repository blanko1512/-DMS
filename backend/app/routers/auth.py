import os

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import get_current_user, require_roles
from app.models.user import User
from app.schemas.auth import AuthUserResponse, LoginRequest, OTPRequiredResponse, OTPTokenResponse, OTPVerifyRequest, RegisterRequest
from app.services.auth_service import access_token_expiration_seconds, authenticate_user, create_access_token, create_login_otp_challenge, hash_password, normalize_role, verify_login_otp


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


@router.post("/login", response_model=OTPRequiredResponse)
def login_user(request: LoginRequest, db: Session = Depends(get_db)):
    user = authenticate_user(db, request.email, request.password)
    challenge = create_login_otp_challenge(db, user)
    return OTPRequiredResponse(
        status="OTP_REQUIRED",
        challenge_id=challenge.id,
        message="OTP verification required.",
    )


@router.post("/verify-otp", response_model=OTPTokenResponse)
def verify_otp(request: OTPVerifyRequest, db: Session = Depends(get_db)):
    user, _ = verify_login_otp(db, request.challenge_id, request.otp)
    return OTPTokenResponse(
        access_token=create_access_token(user),
        token_type="bearer",
        expires_in=access_token_expiration_seconds(),
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