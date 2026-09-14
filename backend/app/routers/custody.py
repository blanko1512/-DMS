import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import get_current_user, require_roles
from app.models.chain_of_custody import ChainOfCustody
from app.models.document import Document
from app.models.user import User
from app.schemas.custody import CustodyEventResponse, CustodyReceiveRequest, CustodyTransferCreate
from app.services.chain_of_custody_service import create_transfer, list_custody, receive_transfer


router = APIRouter(tags=["chain-of-custody"])


@router.post("/api/documents/{document_id}/custody/transfer", response_model=CustodyEventResponse, status_code=200)
def transfer_document_custody(document_id: uuid.UUID, request: CustodyTransferCreate, db: Session = Depends(get_db), current_user: User = Depends(require_roles("ADMIN", "INVESTIGATOR"))):
    document = db.get(Document, document_id)
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found.")
    return create_transfer(db, document, request, current_user)


@router.get("/api/documents/{document_id}/custody", response_model=list[CustodyEventResponse])
def get_document_custody(document_id: uuid.UUID, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    if db.get(Document, document_id) is None:
        raise HTTPException(status_code=404, detail="Document not found.")
    return list_custody(db, document_id)


@router.post("/api/custody/{transfer_id}/receive", response_model=CustodyEventResponse)
def receive_document_custody(transfer_id: uuid.UUID, request: CustodyReceiveRequest, db: Session = Depends(get_db), current_user: User = Depends(require_roles("ADMIN", "INVESTIGATOR", "FORENSIC_OFFICER"))):
    return receive_transfer(db, transfer_id, current_user)