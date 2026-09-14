import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class ShareCreate(BaseModel):
    recipient_user_id: uuid.UUID
    permission: Literal["VIEW", "DOWNLOAD"]
    purpose: str = Field(min_length=1, max_length=500)
    expires_at: datetime


class ShareMetadata(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    share_id: uuid.UUID
    document_id: uuid.UUID
    sender_user_id: uuid.UUID
    recipient_user_id: uuid.UUID
    permission: Literal["VIEW", "DOWNLOAD"]
    purpose: str
    status: Literal["ACTIVE", "EXPIRED", "REVOKED"]
    created_at: datetime
    expires_at: datetime
    revoked_at: datetime | None


class ShareAccessRequest(BaseModel):
    accessing_user_id: uuid.UUID


class ShareAccessResponse(BaseModel):
    share_id: uuid.UUID
    document_id: uuid.UUID
    permission: Literal["VIEW", "DOWNLOAD"]
    status: Literal["ACTIVE"]
    can_download: bool
    access_url: str | None = None
    expires_at: datetime