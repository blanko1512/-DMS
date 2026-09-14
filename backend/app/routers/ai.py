import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import require_roles
from app.models.document import Document
from app.models.user import User
from app.services.ai_service import get_health, simple_connection_test, simple_json_test
from app.services.ai_service import classify_text
from app.services.classification_store import save_classification
from app.services.text_extraction import download_cloudinary_document, extract_text_from_pdf
from app.schemas.classification import ClassificationResult
from app.services.metadata_validation_service import compare_metadata
from app.services.audit_service import record_audit_event


router = APIRouter(prefix="/api/ai", tags=["local-ai"])


@router.get("/health")
def ai_health():
    return get_health()


@router.post("/test")
def ai_connection_test(_: User = Depends(require_roles("ADMIN"))):
    return {"provider": "ollama", "response": simple_connection_test()}


@router.post("/test-json")
def ai_json_test(_: User = Depends(require_roles("ADMIN"))):
    return {"provider": "ollama", "response": simple_json_test()}


@router.post("/classify-test")
def classify_sample_text(_: User = Depends(require_roles("ADMIN"))):
    sample = "FIR No. 123/2026\nDate: 2026-09-12\nPolice Station: Model Town\nComplainant: Amit Kumar"
    result, truncated, model = classify_text(sample)
    save_classification("sample", result)
    return {"provider": "ollama", "model": model, "input_truncated": truncated, **result.model_dump()}


@router.post("/classify/{document_id}")
def classify_document(document_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(require_roles("ADMIN", "INVESTIGATOR", "FORENSIC_OFFICER"))):
    document = db.get(Document, document_id)
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found.")
    if document.storage_provider != "cloudinary" or not document.cloudinary_public_id:
        raise HTTPException(status_code=409, detail="This document is not stored in Cloudinary.")
    if document.mime_type != "application/pdf":
        raise HTTPException(status_code=415, detail="Classification currently supports PDF documents only.")
    pdf_bytes = download_cloudinary_document(document.cloudinary_public_id, document.cloudinary_resource_type or "raw")
    extraction = extract_text_from_pdf(pdf_bytes)
    result, truncated, model = classify_text(extraction.text)
    save_classification(str(document_id), result)
    record_audit_event(db, current_user.id, "DOCUMENT_CLASSIFIED", "document", document.id, "SUCCESS", {"model": model}, document.id)
    db.commit()
    return {
        "document_id": document.id,
        "extraction_method": extraction.method,
        "page_count": extraction.page_count,
        "provider": "ollama",
        "model": model,
        "input_truncated": truncated,
        **result.model_dump(),
    }


@router.post("/validate-metadata-test")
def validate_metadata_mismatch_test(_: User = Depends(require_roles("ADMIN"))):
    classification = ClassificationResult(
        document_type="Other",
        confidence=0.5,
        fields={"case_id": "CASE-002"},
        warnings=[],
    )
    return compare_metadata("controlled-test", {"case_id": "CASE-001"}, classification)
