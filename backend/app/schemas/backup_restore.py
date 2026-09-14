from pydantic import BaseModel


class BackupRestoreVerificationResponse(BaseModel):
    status: str
    backup_valid: bool
    database_restored: bool
    database_name: str | None
    documents_extracted: int
    versions_verified: int
    integrity_verified: bool
    database_counts_match: bool
    database_counts: dict[str, int | None]
    cloudinary_modified: bool
    error: str | None = None