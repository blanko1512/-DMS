import logging
import tempfile
from pathlib import Path

from fastapi import APIRouter, Depends, File, UploadFile
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import require_roles
from app.models.user import User
from app.services.audit_service import record_audit_event
from app.schemas.backup import BackupResponse
from app.schemas.backup_restore import BackupRestoreVerificationResponse
from app.services.backup_service import BackupError, create_backup
from app.services.restore_verification_service import verify_backup_restore


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/backups", tags=["backups"])


@router.post("/create", response_model=BackupResponse)
def create_application_backup(db: Session = Depends(get_db), current_user: User = Depends(require_roles("ADMIN"))):
    try:
        _, result = create_backup(db)
        record_audit_event(db, current_user.id, "BACKUP_CREATED", "backup", result["backup_filename"], "SUCCESS", {"documents": result["documents_backed_up"], "versions": result["versions_backed_up"]})
        db.commit()
    except BackupError as error:
        record_audit_event(db, current_user.id, "BACKUP_VALIDATION_FAILED", "backup", None, "FAILED")
        db.commit()
        logger.error("Backup failed: %s", error)
        raise HTTPException(status_code=502, detail=str(error)) from error
    return result


@router.post("/restore-test", response_model=BackupRestoreVerificationResponse)
def verify_application_backup_restore(
    backup: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("ADMIN")),
):
    temporary_file = tempfile.NamedTemporaryFile(prefix="dms_restore_upload_", suffix=".zip", delete=False)
    temporary_path = temporary_file.name
    try:
        with temporary_file as destination:
            while chunk := backup.file.read(1024 * 1024):
                destination.write(chunk)
        result = verify_backup_restore(db, Path(temporary_path))
        action = "BACKUP_RESTORE_TEST_SUCCESS" if result["status"] == "SUCCESS" else "BACKUP_RESTORE_TEST_FAILED"
        record_audit_event(db, current_user.id, action, "backup", backup.filename, result["status"], {"versions": result.get("versions_verified", 0)})
        db.commit()
        if result["status"] == "FAILED":
            return JSONResponse(status_code=422, content=result)
        return result
    finally:
        Path(temporary_path).unlink(missing_ok=True)