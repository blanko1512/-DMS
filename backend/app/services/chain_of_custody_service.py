from datetime import datetime, timezone
import uuid

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.chain_of_custody import ChainOfCustody
from app.models.document import Document
from app.models.document_version import DocumentVersion
from app.models.user import User
from app.schemas.custody import CustodyEventResponse, CustodyReceiveRequest, CustodyTransferCreate
from app.services.audit_service import record_audit_event


TEMP_USER_EMAIL = "temporary-upload-user@dms.local"


def get_test_sender(db: Session) -> User:
    sender = db.scalar(select(User).where(User.email == TEMP_USER_EMAIL))
    if sender is None:
        raise HTTPException(status_code=503, detail="Temporary test sender user is not configured.")
    return sender


def _event_response(event: ChainOfCustody, transfer_id: uuid.UUID) -> CustodyEventResponse:
    return CustodyEventResponse(
        event_id=event.id,
        transfer_id=transfer_id,
        document_id=event.document_id,
        from_user_id=event.from_user_id,
        to_user_id=event.to_user_id,
        event=event.action,
        status=event.status,
        timestamp=event.timestamp,
        reason=event.reason,
        notes=event.remarks,
        version_id=event.version_id,
    )


def create_transfer(db: Session, document: Document, request: CustodyTransferCreate, sender: User) -> CustodyEventResponse:
    if sender.id == request.to_user_id:
        raise HTTPException(status_code=422, detail="Sender and recipient must be different users.")
    recipient = db.get(User, request.to_user_id)
    if recipient is None or not recipient.is_active:
        raise HTTPException(status_code=404, detail="Recipient user was not found or is inactive.")
    if request.version_id is not None:
        version = db.get(DocumentVersion, request.version_id)
        if version is None or version.document_id != document.id:
            raise HTTPException(status_code=422, detail="The selected version does not belong to this document.")

    event = ChainOfCustody(
        document_id=document.id,
        from_user_id=sender.id,
        to_user_id=recipient.id,
        action="TRANSFERRED",
        status="PENDING",
        reason=request.reason,
        remarks=request.notes,
        version_id=request.version_id,
    )
    db.add(event)
    db.flush()
    event.related_transfer_id = event.id
    record_audit_event(db, sender.id, "CUSTODY_TRANSFER_CREATED", "custody", event.id, "SUCCESS", {"transfer_id": str(event.id)}, document.id)
    db.commit()
    db.refresh(event)
    return _event_response(event, event.id)


def list_custody(db: Session, document_id: uuid.UUID) -> list[CustodyEventResponse]:
    events = db.scalars(select(ChainOfCustody).where(ChainOfCustody.document_id == document_id).order_by(ChainOfCustody.timestamp, ChainOfCustody.id)).all()
    return [_event_response(event, event.related_transfer_id or event.id) for event in events]


def receive_transfer(db: Session, transfer_id: uuid.UUID, recipient: User) -> CustodyEventResponse:
    if recipient is None or not recipient.is_active:
        raise HTTPException(status_code=404, detail="Recipient user was not found or is inactive.")
    transfer = db.scalar(select(ChainOfCustody).where(ChainOfCustody.id == transfer_id).with_for_update())
    if transfer is None or transfer.action != "TRANSFERRED":
        raise HTTPException(status_code=404, detail="Custody transfer not found.")
    if transfer.to_user_id != recipient.id:
        record_audit_event(db, recipient.id, "CUSTODY_TRANSFER_REJECTED", "custody", transfer_id, "DENIED", {"transfer_id": str(transfer_id)}, transfer.document_id)
        db.commit()
        raise HTTPException(status_code=403, detail="Only the designated recipient can receive this transfer.")
    if transfer.status != "PENDING":
        raise HTTPException(status_code=409, detail="This custody transfer has already been received or completed.")

    received = ChainOfCustody(
        document_id=transfer.document_id,
        from_user_id=transfer.from_user_id,
        to_user_id=transfer.to_user_id,
        action="RECEIVED",
        status="RECEIVED",
        reason=transfer.reason,
        remarks=transfer.remarks,
        related_transfer_id=transfer.id,
        version_id=transfer.version_id,
    )
    transfer.status = "RECEIVED"
    db.add(received)
    record_audit_event(db, recipient.id, "CUSTODY_TRANSFER_RECEIVED", "custody", transfer_id, "SUCCESS", {"transfer_id": str(transfer_id)}, transfer.document_id)
    db.commit()
    db.refresh(received)
    return _event_response(received, transfer.id)