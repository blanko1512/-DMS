import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import get_current_user, require_roles
from app.models.document_transfer import DocumentTransfer
from app.models.user import User
from app.routers.documents import get_temporary_user
from app.schemas.sharing import ShareAccessRequest, ShareAccessResponse, ShareMetadata
from app.services.sharing_service import access_share, revoke_share, to_metadata


router = APIRouter(prefix="/api/shares", tags=["sharing"])


@router.get("/{share_id}", response_model=ShareMetadata)
def get_share(share_id: uuid.UUID, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    share = db.get(DocumentTransfer, share_id)
    if share is None:
        raise HTTPException(status_code=404, detail="Share not found.")
    return to_metadata(share)


@router.post("/{share_id}/revoke", response_model=ShareMetadata)
def revoke_document_share(share_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(require_roles("ADMIN", "INVESTIGATOR"))):
    share = db.get(DocumentTransfer, share_id)
    if share is None:
        raise HTTPException(status_code=404, detail="Share not found.")
    return revoke_share(db, share, current_user.id)


@router.post("/{share_id}/access", response_model=ShareAccessResponse)
def access_document_share(share_id: uuid.UUID, request: ShareAccessRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    share = db.get(DocumentTransfer, share_id)
    if share is None:
        raise HTTPException(status_code=404, detail="Share not found.")
    return access_share(db, share, current_user.id)