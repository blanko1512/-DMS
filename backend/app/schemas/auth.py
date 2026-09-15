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


class OTPRequiredResponse(BaseModel):
    status: str
    challenge_id: uuid.UUID
    message: str
    dev_otp: str | None = None


class OTPVerifyRequest(BaseModel):
    challenge_id: uuid.UUID
    otp: str = Field(min_length=6, max_length=6, pattern=r"^\d{6}$")


class OTPTokenResponse(BaseModel):
    access_token: str
    token_type: str
    expires_in: int


class AuthUserResponse(BaseModel):
    user_id: uuid.UUID
    username: str
    role: str
    is_active: bool