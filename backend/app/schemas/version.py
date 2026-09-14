import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class DocumentVersionMetadata(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    document_id: uuid.UUID
    version_number: int
    original_filename: str
    storage_path: str
    sha256_hash: str | None
    file_size: int | None
    mime_type: str | None
    uploaded_by: uuid.UUID
    change_reason: str | None
    status: str
    created_at: datetime
    is_latest: bool = False
