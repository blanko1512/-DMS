import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.dependencies.auth import get_current_user, require_roles
from app.models.document import Document
from app.models.document_version import DocumentVersion
from app.models.user import User
from app.schemas.blockchain import BlockchainProofResponse, BlockchainVerifyResponse
from app.services.blockchain_service import create_proof, verify_proof
from app.services.audit_service import record_audit_event


router = APIRouter(prefix="/api/documents", tags=["blockchain-integrity"])


@router.post("/{document_id}/blockchain-proof", response_model=BlockchainProofResponse)
def create_document_blockchain_proof(document_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(require_roles("ADMIN", "INVESTIGATOR", "FORENSIC_OFFICER"))):
    document = db.query(Document).options(selectinload(Document.versions)).filter(Document.id == document_id).first()
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found.")
    record = create_proof(db, document)
    record_audit_event(db, current_user.id, "BLOCKCHAIN_PROOF_CREATED", "document", document.id, "SUCCESS", {"version_id": str(record.version_id)}, document.id)
    db.commit()
    return BlockchainProofResponse(
        document_id=record.document_id,
        version_id=record.version_id,
        sha256=record.sha256_hash,
        proof_hash=record.proof_hash,
        blockchain_status=record.verification_status,
        network=record.network,
        transaction_hash=record.transaction_id,
        recorded_at=record.timestamp,
    )


@router.get("/{document_id}/blockchain-verify", response_model=BlockchainVerifyResponse)
def verify_document_blockchain_proof(document_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    document = db.query(Document).options(selectinload(Document.versions)).filter(Document.id == document_id).first()
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found.")
    result = verify_proof(db, document)
    version = max(document.versions, key=lambda item: item.version_number)
    action = {"VERIFIED": "BLOCKCHAIN_VERIFICATION_SUCCESS", "MISMATCH": "BLOCKCHAIN_VERIFICATION_MISMATCH", "NOT_ANCHORED": "BLOCKCHAIN_NOT_ANCHORED"}.get(result["integrity_status"], "BLOCKCHAIN_VERIFICATION_MISMATCH")
    record_audit_event(db, current_user.id, action, "document", document.id, result["integrity_status"], {"version_id": str(version.id)}, document.id)
    db.commit()
    return BlockchainVerifyResponse(document_id=document.id, version_id=version.id, **result)


@router.post("/{document_id}/blockchain-proof/version/{version_number}", response_model=BlockchainProofResponse)
def create_version_blockchain_proof(document_id: uuid.UUID, version_number: int, db: Session = Depends(get_db), current_user: User = Depends(require_roles("ADMIN", "INVESTIGATOR", "FORENSIC_OFFICER"))):
    document = db.query(Document).options(selectinload(Document.versions)).filter(Document.id == document_id).first()
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found.")
    version = next((item for item in document.versions if item.version_number == version_number), None)
    if version is None:
        raise HTTPException(status_code=404, detail="Document version not found.")
    record = create_proof(db, document, version)
    record_audit_event(db, current_user.id, "BLOCKCHAIN_PROOF_CREATED", "document_version", version.id, "SUCCESS", document_id=document.id)
    db.commit()
    return BlockchainProofResponse(document_id=record.document_id, version_id=record.version_id, sha256=record.sha256_hash, proof_hash=record.proof_hash, blockchain_status=record.verification_status, network=record.network, transaction_hash=record.transaction_id, recorded_at=record.timestamp)


@router.get("/{document_id}/blockchain-verify/version/{version_number}", response_model=BlockchainVerifyResponse)
def verify_version_blockchain_proof(document_id: uuid.UUID, version_number: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    document = db.query(Document).options(selectinload(Document.versions)).filter(Document.id == document_id).first()
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found.")
    version = next((item for item in document.versions if item.version_number == version_number), None)
    if version is None:
        raise HTTPException(status_code=404, detail="Document version not found.")
    result = verify_proof(db, document, version)
    action = {"VERIFIED": "BLOCKCHAIN_VERIFICATION_SUCCESS", "MISMATCH": "BLOCKCHAIN_VERIFICATION_MISMATCH", "NOT_ANCHORED": "BLOCKCHAIN_NOT_ANCHORED"}.get(result["integrity_status"], "BLOCKCHAIN_VERIFICATION_MISMATCH")
    record_audit_event(db, current_user.id, action, "document_version", version.id, result["integrity_status"], document_id=document.id)
    db.commit()
    return BlockchainVerifyResponse(document_id=document.id, version_id=version.id, **result)
