from datetime import datetime

from pydantic import BaseModel


class BackupResponse(BaseModel):
    status: str
    backup_filename: str
    backup_path: str
    database_backup: bool
    documents_backed_up: int
    versions_backed_up: int
    integrity_verified: bool
    created_at: datetime