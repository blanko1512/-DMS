import uuid

from fastapi import HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.document import Document
from app.models.document_version import DocumentVersion
from app.models.user import User
from app.services.storage import read_and_hash_upload, upload_to_cloudinary, validate_file


def create_initial_version(db: Session, document: Document) -> DocumentVersion:
    version = DocumentVersion(
        document_id=document.id,
        version_number=1,
        original_filename=document.original_filename,
        storage_path=document.storage_path,
        sha256_hash=document.sha256_hash,
        file_size=document.file_size,
        mime_type=document.mime_type,
        uploaded_by=document.uploaded_by,
        status="PENDING_VALIDATION",
    )
    db.add(version)
    return version


def get_next_version_number(db: Session, document_id: uuid.UUID) -> int:
    latest = db.scalar(
        select(DocumentVersion.version_number)
        .where(DocumentVersion.document_id == document_id)
        .order_by(DocumentVersion.version_number.desc())
        .limit(1)
    )
    return (latest or 0) + 1


def upload_new_version(
    db: Session,
    document: Document,
    file: UploadFile,
    uploader: User,
    change_reason: str | None,
) -> DocumentVersion:
    header = file.file.read(16)
    file.file.seek(0)
    safe_filename = validate_file(file, header)
    content, file_hash, file_size = read_and_hash_upload(file)
    version_id = uuid.uuid4()
    cloudinary_uploaded = False
    try:
        cloudinary_result = upload_to_cloudinary(content, str(document.case_id), str(version_id))
        cloudinary_uploaded = True
        version = DocumentVersion(
            id=version_id,
            document_id=document.id,
            version_number=get_next_version_number(db, document.id),
            original_filename=safe_filename,
            storage_path=f"cloudinary://{cloudinary_result['public_id']}",
            sha256_hash=file_hash,
            file_size=file_size,
            mime_type=file.content_type,
            uploaded_by=uploader.id,
            change_reason=change_reason,
            status="PENDING_VALIDATION",
        )
        db.add(version)
        db.commit()
        db.refresh(version)
        return version
    except Exception:
        db.rollback()
        if cloudinary_uploaded:
            from app.services.storage import delete_from_cloudinary
            delete_from_cloudinary(cloudinary_result["public_id"])
        raise


def list_versions(db: Session, document_id: uuid.UUID) -> list[DocumentVersion]:
    return list(db.scalars(
        select(DocumentVersion)
        .where(DocumentVersion.document_id == document_id)
        .order_by(DocumentVersion.version_number)
    ).all())
