import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class CustodyTransferCreate(BaseModel):
    to_user_id: uuid.UUID
    reason: str = Field(min_length=1, max_length=500)
    notes: str | None = Field(default=None, max_length=2000)
    version_id: uuid.UUID | None = None


class CustodyReceiveRequest(BaseModel):
    to_user_id: uuid.UUID


class CustodyEventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    event_id: uuid.UUID
    transfer_id: uuid.UUID
    document_id: uuid.UUID
    from_user_id: uuid.UUID | None
    to_user_id: uuid.UUID | None
    event: str
    status: Literal["PENDING", "RECEIVED"]
    timestamp: datetime
    reason: str | None
    notes: str | None
    version_id: uuid.UUID | None