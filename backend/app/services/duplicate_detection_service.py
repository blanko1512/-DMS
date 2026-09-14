from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.document import Document
from app.schemas.duplicate_detection import DuplicateCheckResult, DuplicateDocument


METHOD = "SHA-256 exact match"


def find_duplicates(db: Session, document: Document) -> DuplicateCheckResult:
    if not document.sha256_hash:
        return DuplicateCheckResult(
            document_id=document.id,
            sha256_hash=None,
            duplicate_count=0,
            duplicates=[],
        )

    matches = db.scalars(
        select(Document)
        .where(Document.sha256_hash == document.sha256_hash, Document.id != document.id)
        .order_by(Document.created_at)
    ).all()
    duplicates = [
        DuplicateDocument(
            document_id=match.id,
            original_filename=match.original_filename,
            case_id=match.case_id,
            document_type=match.document_type,
            created_at=match.created_at,
            sha256_hash=match.sha256_hash,
        )
        for match in matches
    ]
    return DuplicateCheckResult(
        document_id=document.id,
        sha256_hash=document.sha256_hash,
        duplicate_count=len(duplicates),
        duplicates=duplicates,
    )
