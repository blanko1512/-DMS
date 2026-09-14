import json
import uuid

from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog


def record_audit_event(
    db: Session,
    user_id: uuid.UUID | None,
    action: str,
    resource_type: str | None = None,
    resource_id: str | uuid.UUID | None = None,
    result: str | None = None,
    details: dict | str | None = None,
    document_id: uuid.UUID | None = None,
) -> AuditLog:
    safe_details = details if isinstance(details, str) else json.dumps(details, separators=(",", ":")) if details else None
    event = AuditLog(
        user_id=user_id,
        document_id=document_id,
        action=action,
        resource_type=resource_type,
        resource_id=str(resource_id) if resource_id is not None else None,
        result=result,
        details=safe_details,
    )
    db.add(event)
    return event