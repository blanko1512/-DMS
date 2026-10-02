import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class RegisterRequest(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    role: str = "VIEWER"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class MobileOtpRevealRequest(BaseModel):
    email: EmailStr
    password: str


class AuthenticatorSessionRequest(BaseModel):
    email: EmailStr
    password: str
    device_id: str = Field(min_length=1, max_length=255)


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: uuid.UUID
    username: str
    role: str
    is_active: bool


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user_id: uuid.UUID
    role: str


class LoginChallengeResponse(BaseModel):
    status: str
    challenge_id: uuid.UUID
    message: str
    dev_otp: str | None = None
    expires_at: datetime | None = None


class OTPRequiredResponse(LoginChallengeResponse):
    pass


class AuthenticatorRequiredResponse(LoginChallengeResponse):
    pass


class AuthenticatorChallengeStatusResponse(BaseModel):
    challenge_id: uuid.UUID
    status: str
    expires_at: datetime


class PendingAuthenticatorChallengeResponse(BaseModel):
    challenge_id: uuid.UUID
    created_at: datetime
    expires_at: datetime
    purpose: str = "AUTHENTICATOR_LOGIN"


class AuthenticatorChallengeApprovalResponse(BaseModel):
    status: str
    challenge_id: uuid.UUID
    message: str


class AuthenticatorChallengeApprovalRequest(BaseModel):
    challenge_id: uuid.UUID
    device_id: str = Field(min_length=1, max_length=255)
    payload: str = Field(min_length=1, max_length=4096)
    signature: str = Field(min_length=1, max_length=4096)


class AuthenticatorLoginCompletionRequest(BaseModel):
    challenge_id: uuid.UUID


class OTPVerifyRequest(BaseModel):
    challenge_id: uuid.UUID
    otp: str = Field(min_length=6, max_length=6, pattern=r"^\d{6}$")


class OTPTokenResponse(BaseModel):
    access_token: str
    token_type: str
    expires_in: int


class AuthenticatorSessionResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int = 600
    can_register: bool


class AuthUserResponse(BaseModel):
    user_id: uuid.UUID
    username: str
    role: str
    is_active: bool


class AuthenticatorDeviceRegistrationRequest(BaseModel):
    device_id: str = Field(min_length=1, max_length=255)
    device_name: str | None = Field(default=None, min_length=1, max_length=150)
    public_key: str | None = Field(default=None, min_length=1, max_length=4096)


class AuthenticatorDeviceResponse(BaseModel):
    device_id: str
    device_name: str | None = None
    public_key: str | None = None
    is_active: bool
    created_at: datetime
    last_used_at: datetime | None = None