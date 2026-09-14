import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy import String, and_, cast, or_
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import get_current_user, require_roles
from app.models.case import Case
from app.models.document import Document
from app.models.user import User
from app.schemas.document import DocumentListItem, DocumentMetadata
from app.services.storage import (
    delete_from_cloudinary,
    read_and_hash_upload,
    upload_to_cloudinary,
    validate_file,
    verify_cloudinary_resource,
)
from app.services.text_extraction import download_cloudinary_document, extract_text_from_pdf
from app.services.classification_store import get_classification
from app.services.validation_service import validate_required_fields
from app.services.metadata_validation_service import compare_metadata
from app.schemas.metadata_validation import MetadataValidationResult
from app.schemas.duplicate_detection import DuplicateCheckResult
from app.services.duplicate_detection_service import find_duplicates
from app.schemas.version import DocumentVersionMetadata
from app.services.version_service import create_initial_version, get_next_version_number, list_versions, upload_new_version
from app.schemas.sharing import ShareCreate, ShareAccessRequest, ShareAccessResponse, ShareMetadata
from app.services.sharing_service import create_share, list_shares
from app.services.audit_service import record_audit_event


router = APIRouter(prefix="/api/documents", tags=["documents"])
TEMP_USER_EMAIL = "temporary-upload-user@dms.local"


def get_temporary_user(db: Session) -> User:
    user = db.query(User).filter(User.email == TEMP_USER_EMAIL).first()
    if user is None:
        user = User(
            name="Temporary Upload User",
            email=TEMP_USER_EMAIL,
            password_hash="not-for-authentication",
            role="test_uploader",
            is_active=True,
        )
        db.add(user)
        db.flush()
    return user


@router.post("/upload", response_model=DocumentMetadata, status_code=status.HTTP_201_CREATED)
def upload_document(
    file: UploadFile = File(...),
    case_id: uuid.UUID = Form(...),
    document_type: str | None = Form(None),
    department: str | None = Form(None),
    sensitivity: str | None = Form(None),
    description: str | None = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("ADMIN", "INVESTIGATOR")),
):
    if db.query(Case).filter(Case.id == case_id).first() is None:
        raise HTTPException(status_code=404, detail="Case not found.")
    header = file.file.read(16)
    file.file.seek(0)
    safe_filename = validate_file(file, header)
    document_id = uuid.uuid4()
    cloudinary_public_id = f"DMS/documents/{case_id}/{document_id}"
    cloudinary_uploaded = False
    try:
        content, file_hash, file_size = read_and_hash_upload(file)
        cloudinary_result = upload_to_cloudinary(content, str(case_id), str(document_id))
        cloudinary_uploaded = True
        document = Document(
            id=document_id,
            case_id=case_id,
            original_filename=safe_filename,
            storage_path=f"cloudinary://{cloudinary_result['public_id']}",
            storage_provider="cloudinary",
            cloudinary_public_id=cloudinary_result["public_id"],
            cloudinary_resource_type=cloudinary_result.get("resource_type", "raw"),
            cloudinary_version=cloudinary_result.get("version"),
            description=description,
            document_type=document_type,
            department=department,
            sensitivity=sensitivity,
            mime_type=file.content_type,
            file_size=file_size,
            sha256_hash=file_hash,
            status="PENDING_VALIDATION",
            uploaded_by=get_temporary_user(db).id,
        )
        db.add(document)
        create_initial_version(db, document)
        db.commit()
        db.refresh(document)
        record_audit_event(db, current_user.id, "DOCUMENT_UPLOADED", "document", document.id, "SUCCESS", {"storage_provider": document.storage_provider}, document_id=document.id)
        db.commit()
        return document
    except Exception:
        db.rollback()
        if cloudinary_uploaded:
            delete_from_cloudinary(cloudinary_public_id)
        raise


@router.get("", response_model=list[DocumentListItem])
def list_documents(
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return (
        db.query(Document)
        .order_by(Document.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )


@router.get("/search", response_model=list[DocumentListItem])
def search_documents(
    q: str | None = Query(default=None, min_length=1),
    case_id: str | None = Query(default=None, min_length=1),
    document_type: str | None = Query(default=None, min_length=1),
    department: str | None = Query(default=None, min_length=1),
    status: str | None = Query(default=None, min_length=1),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    filters = []
    if q:
        query_pattern = f"%{q.strip()}%"
        filters.append(
            or_(
                Document.original_filename.ilike(query_pattern),
                cast(Document.case_id, String).ilike(query_pattern),
                Document.document_type.ilike(query_pattern),
                Document.department.ilike(query_pattern),
                Document.description.ilike(query_pattern),
            )
        )
    if case_id:
        filters.append(cast(Document.case_id, String).ilike(case_id.strip()))
    if document_type:
        filters.append(Document.document_type.ilike(document_type.strip()))
    if department:
        filters.append(Document.department.ilike(department.strip()))
    if status:
        filters.append(Document.status.ilike(status.strip()))

    documents = (
        db.query(Document)
        .filter(and_(*filters) if filters else True)
        .order_by(Document.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    filter_names = [name for name, value in (("q", q), ("case_id", case_id), ("document_type", document_type), ("department", department), ("status", status)) if value]
    record_audit_event(
        db,
        current_user.id,
        "DOCUMENT_SEARCHED",
        "document",
        None,
        "SUCCESS",
        {"filters": filter_names, "result_count": len(documents)},
    )
    db.commit()
    return documents


@router.get("/{document_id}", response_model=DocumentMetadata)
def get_document(document_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    document = db.get(Document, document_id)
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found.")
    record_audit_event(db, current_user.id, "DOCUMENT_VIEWED", "document", document.id, "SUCCESS", document_id=document.id)
    db.commit()
    return document


@router.get("/{document_id}/storage-check")
def check_document_storage(document_id: uuid.UUID, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    document = db.get(Document, document_id)
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found.")
    result = verify_cloudinary_resource(document.cloudinary_public_id, document.cloudinary_resource_type or "raw")
    return {
        "document_id": document.id,
        "exists": True,
        "storage_provider": document.storage_provider,
        "cloudinary_public_id": result.get("public_id"),
        "size": result.get("bytes"),
    }


@router.post("/{document_id}/extract-text")
def extract_document_text(document_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(require_roles("ADMIN", "INVESTIGATOR", "FORENSIC_OFFICER"))):
    document = db.get(Document, document_id)
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found.")
    if document.storage_provider != "cloudinary" or not document.cloudinary_public_id:
        raise HTTPException(status_code=409, detail="This document is not stored in Cloudinary.")
    if document.mime_type != "application/pdf":
        raise HTTPException(status_code=415, detail="Text extraction currently supports PDF documents only.")
    pdf_bytes = download_cloudinary_document(document.cloudinary_public_id, document.cloudinary_resource_type or "raw")
    result = extract_text_from_pdf(pdf_bytes)
    record_audit_event(db, current_user.id, "DOCUMENT_TEXT_EXTRACTED", "document", document.id, "SUCCESS", document_id=document.id)
    db.commit()
    return {
        "document_id": document.id,
        "extraction_method": result.method,
        "page_count": result.page_count,
        "extracted_text_length": len(result.text),
        "extracted_text": result.text,
    }


@router.post("/{document_id}/validate-required-fields")
def validate_document_required_fields(document_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(require_roles("ADMIN", "INVESTIGATOR", "FORENSIC_OFFICER"))):
    document = db.get(Document, document_id)
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found.")
    classification = get_classification(str(document_id))
    if classification is None:
        raise HTTPException(status_code=422, detail="Classify this document first, then run required-field validation.")
    result = validate_required_fields(classification)
    record_audit_event(
        db,
        current_user.id,
        "DOCUMENT_REQUIRED_FIELDS_VALIDATED",
        "document",
        document.id,
        result["validation_status"],
        {"document_type": result["document_type"], "missing_field_count": len(result["missing_fields"])},
        document_id=document.id,
    )
    db.commit()
    return result


@router.post("/{document_id}/validate-consistency", response_model=MetadataValidationResult)
def validate_document_metadata(document_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(require_roles("ADMIN", "INVESTIGATOR", "FORENSIC_OFFICER"))):
    document = db.get(Document, document_id)
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found.")
    classification = get_classification(str(document_id))
    if classification is None:
        raise HTTPException(status_code=422, detail="Classify this document first, then run metadata consistency checking.")
    metadata = {
        "case_id": str(document.case_id),
        "document_type": document.document_type,
        "document_date": None,
        "department": document.department,
        "officer_name": None,
        "location": None,
        "reference_number": None,
    }
    result = compare_metadata(str(document_id), metadata, classification)
    record_audit_event(
        db,
        current_user.id,
        "DOCUMENT_METADATA_CONSISTENCY_CHECKED",
        "document",
        document.id,
        result.overall_status,
        {"mismatch_count": sum(check.status == "MISMATCH" for check in result.checks), "checked_field_count": len(result.checks)},
        document_id=document.id,
    )
    db.commit()
    return result


@router.get("/{document_id}/duplicates", response_model=DuplicateCheckResult)
def check_document_duplicates(document_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(require_roles("ADMIN", "INVESTIGATOR", "FORENSIC_OFFICER"))):
    document = db.get(Document, document_id)
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found.")
    result = find_duplicates(db, document)
    record_audit_event(db, current_user.id, "DOCUMENT_DUPLICATES_CHECKED", "document", document.id, "SUCCESS", {"duplicate_count": result.duplicate_count}, document_id=document.id)
    db.commit()
    return result


@router.post("/{document_id}/versions", response_model=DocumentVersionMetadata, status_code=status.HTTP_201_CREATED)
def upload_document_version(
    document_id: uuid.UUID,
    file: UploadFile = File(...),
    change_reason: str | None = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("ADMIN", "INVESTIGATOR")),
):
    document = db.get(Document, document_id)
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found.")
    version = upload_new_version(db, document, file, get_temporary_user(db), change_reason)
    version.is_latest = True
    record_audit_event(db, current_user.id, "DOCUMENT_VERSION_CREATED", "document_version", version.id, "SUCCESS", document_id=document_id)
    db.commit()
    return version


@router.get("/{document_id}/versions", response_model=list[DocumentVersionMetadata])
def get_document_versions(document_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if db.get(Document, document_id) is None:
        raise HTTPException(status_code=404, detail="Document not found.")
    versions = list_versions(db, document_id)
    latest_number = versions[-1].version_number if versions else None
    record_audit_event(db, current_user.id, "DOCUMENT_VERSIONS_VIEWED", "document", document_id, "SUCCESS", document_id=document_id)
    db.commit()
    return [
        {**DocumentVersionMetadata.model_validate(version).model_dump(), "is_latest": version.version_number == latest_number}
        for version in versions
    ]


@router.get("/{document_id}/versions/{version_number}", response_model=DocumentVersionMetadata)
def get_document_version(document_id: uuid.UUID, version_number: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    document = db.get(Document, document_id)
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found.")
    version = next((item for item in list_versions(db, document_id) if item.version_number == version_number), None)
    if version is None:
        raise HTTPException(status_code=404, detail="Document version not found.")
    latest = get_next_version_number(db, document_id) - 1
    return {**DocumentVersionMetadata.model_validate(version).model_dump(), "is_latest": version_number == latest}


@router.post("/{document_id}/shares", response_model=ShareMetadata, status_code=status.HTTP_201_CREATED)
def create_document_share(document_id: uuid.UUID, request: ShareCreate, db: Session = Depends(get_db), current_user: User = Depends(require_roles("ADMIN", "INVESTIGATOR"))):
    document = db.get(Document, document_id)
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found.")
    return create_share(db, document, current_user, request)


@router.get("/{document_id}/shares", response_model=list[ShareMetadata])
def get_document_shares(document_id: uuid.UUID, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    if db.get(Document, document_id) is None:
        raise HTTPException(status_code=404, detail="Document not found.")
    return list_shares(db, document_id)




