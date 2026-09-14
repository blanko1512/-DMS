from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class DuplicateDocument(BaseModel):
    model_config = ConfigDict(extra="forbid")

    document_id: UUID
    original_filename: str
    case_id: UUID
    document_type: str | None
    created_at: datetime
    sha256_hash: str


class DuplicateCheckResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    document_id: UUID
    sha256_hash: str | None
    duplicate_count: int
    duplicates: list[DuplicateDocument]
