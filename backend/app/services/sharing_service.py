from datetime import datetime, timezone
from uuid import UUID

import cloudinary.utils
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.document import Document
from app.models.document_transfer import DocumentTransfer
from app.models.user import User
from app.schemas.sharing import ShareAccessResponse, ShareCreate, ShareMetadata
from app.services.storage import configure_cloudinary
from app.services.audit_service import record_audit_event


def _status(share: DocumentTransfer) -> str:
    if share.status == "REVOKED":
        return "REVOKED"
    if share.expires_at and share.expires_at <= datetime.now(timezone.utc):
        return "EXPIRED"
    return "ACTIVE"


def _audit(db: Session, share: DocumentTransfer, action: str, user_id: UUID, details: str) -> None:
    result = "DENIED" if "DENIED" in action else "SUCCESS"
    record_audit_event(db, user_id, action, "share", share.id, result, details, share.document_id)


def create_share(db: Session, document: Document, sender: User, request: ShareCreate) -> ShareMetadata:
    if request.expires_at <= datetime.now(timezone.utc):
        raise HTTPException(status_code=422, detail="Share expiry must be in the future.")
    recipient = db.get(User, request.recipient_user_id)
    if recipient is None or not recipient.is_active:
        raise HTTPException(status_code=404, detail="Recipient user was not found or is inactive.")
    share = DocumentTransfer(
        document_id=document.id,
        from_user_id=sender.id,
        to_user_id=recipient.id,
        permission=request.permission,
        purpose=request.purpose,
        expires_at=request.expires_at,
        status="ACTIVE",
    )
    db.add(share)
    db.flush()
    _audit(db, share, "SHARE_CREATED", sender.id, f"Permission={share.permission}; purpose={share.purpose}")
    db.commit()
    db.refresh(share)
    return to_metadata(share)


def to_metadata(share: DocumentTransfer) -> ShareMetadata:
    return ShareMetadata(
        share_id=share.id,
        document_id=share.document_id,
        sender_user_id=share.from_user_id,
        recipient_user_id=share.to_user_id,
        permission=share.permission,
        purpose=share.purpose or "",
        status=_status(share),
        created_at=share.created_at,
        expires_at=share.expires_at,
        revoked_at=share.revoked_at,
    )


def list_shares(db: Session, document_id: UUID) -> list[ShareMetadata]:
    shares = db.scalars(select(DocumentTransfer).where(DocumentTransfer.document_id == document_id).order_by(DocumentTransfer.created_at)).all()
    return [to_metadata(share) for share in shares]


def revoke_share(db: Session, share: DocumentTransfer, user_id: UUID) -> ShareMetadata:
    if _status(share) == "REVOKED":
        return to_metadata(share)
    share.status = "REVOKED"
    share.revoked_at = datetime.now(timezone.utc)
    _audit(db, share, "SHARE_REVOKED", user_id, "Share revoked.")
    db.commit()
    db.refresh(share)
    return to_metadata(share)


def access_share(db: Session, share: DocumentTransfer, accessing_user_id: UUID) -> ShareAccessResponse:
    if accessing_user_id != share.to_user_id:
        raise HTTPException(status_code=403, detail="Only the designated recipient may access this share.")
    current_status = _status(share)
    if current_status == "REVOKED":
        _audit(db, share, "SHARE_ACCESS_DENIED_REVOKED", accessing_user_id, "Access denied because share was revoked.")
        db.commit()
        raise HTTPException(status_code=403, detail="This share has been revoked.")
    if current_status == "EXPIRED":
        share.status = "EXPIRED"
        _audit(db, share, "SHARE_ACCESS_DENIED_EXPIRED", accessing_user_id, "Access denied because share expired.")
        db.commit()
        raise HTTPException(status_code=410, detail="This share has expired.")

    url = None
    if share.permission == "DOWNLOAD":
        document = db.get(Document, share.document_id)
        if not document or not document.cloudinary_public_id:
            raise HTTPException(status_code=409, detail="The shared document is not available in Cloudinary.")
        configure_cloudinary()
        url = cloudinary.utils.private_download_url(
            document.cloudinary_public_id,
            "pdf",
            resource_type=document.cloudinary_resource_type or "raw",
            type="authenticated",
            secure=True,
            expires_at=int(share.expires_at.timestamp()),
        )
    _audit(db, share, "SHARE_ACCESSED", accessing_user_id, f"Permission={share.permission}")
    db.commit()
    return ShareAccessResponse(
        share_id=share.id,
        document_id=share.document_id,
        permission=share.permission,
        status="ACTIVE",
        can_download=share.permission == "DOWNLOAD",
        access_url=url,
        expires_at=share.expires_at,
    )