from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import require_roles
from app.models.audit_log import AuditLog
from app.models.user import User
from app.schemas.audit import AuditLogResponse


router = APIRouter(prefix="/api/audit-logs", tags=["audit"])


@router.get("", response_model=list[AuditLogResponse])
def list_audit_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("ADMIN")),
):
    return db.query(AuditLog).order_by(AuditLog.timestamp.desc(), AuditLog.id.desc()).offset(skip).limit(limit).all()