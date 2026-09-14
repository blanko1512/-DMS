import hashlib
import json
import logging
import os
import shutil
import subprocess
import tempfile
import zipfile
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy.orm import Session, selectinload

from app.models.document import Document
from app.models.document_version import DocumentVersion
from app.services.storage import sanitize_filename
from app.services.text_extraction import download_cloudinary_document


logger = logging.getLogger(__name__)
BACKUP_VERSION = "1.0"
BACKEND_ROOT = Path(__file__).resolve().parents[2]
BACKUPS_ROOT = BACKEND_ROOT / "backups"


class BackupError(Exception):
    pass


def _pg_dump_path() -> str:
    configured = os.getenv("PG_DUMP_PATH")
    if configured:
        return configured
    discovered = shutil.which("pg_dump")
    if discovered:
        return discovered
    standard_path = Path(os.environ.get("ProgramFiles", r"C:\Program Files")) / "PostgreSQL"
    candidates = sorted(standard_path.glob("*/bin/pg_dump.exe"), reverse=True)
    if candidates:
        return str(candidates[0])
    raise BackupError("PostgreSQL pg_dump was not found. Set PG_DUMP_PATH or add pg_dump to PATH.")


def _database_dump(destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    password = os.getenv("POSTGRES_PASSWORD", "")
    command = [
        _pg_dump_path(),
        "--format=plain",
        "--no-owner",
        "--no-privileges",
        "--file",
        str(destination),
        "--host",
        os.getenv("POSTGRES_HOST", "localhost"),
        "--port",
        os.getenv("POSTGRES_PORT", "5432"),
        "--username",
        os.getenv("POSTGRES_USER", "postgres"),
        os.getenv("POSTGRES_DB", "dms_db"),
    ]
    child_environment = os.environ.copy()
    child_environment["PGPASSWORD"] = password
    result = subprocess.run(
        command,
        env=child_environment,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.PIPE,
        check=False,
        timeout=300,
    )
    if result.returncode != 0:
        destination.unlink(missing_ok=True)
        raise BackupError("PostgreSQL database dump failed.")


def _local_document_path(storage_path: str) -> Path:
    path = (BACKEND_ROOT / storage_path).resolve()
    storage_root = (BACKEND_ROOT / "storage").resolve()
    if storage_root not in path.parents:
        raise BackupError("A local document path is outside the application storage directory.")
    return path


def _download_version(document: Document, version: DocumentVersion) -> bytes:
    if version.storage_path.startswith("cloudinary://"):
        public_id = version.storage_path.removeprefix("cloudinary://")
        return download_cloudinary_document(public_id, document.cloudinary_resource_type or "raw")
    return _local_document_path(version.storage_path).read_bytes()


def _backup_versions(staging_documents: Path, documents: list[Document]) -> tuple[list[dict], int]:
    manifest_files: list[dict] = []
    document_ids: set[str] = set()
    for document in documents:
        for version in sorted(document.versions, key=lambda item: item.version_number):
            document_id = str(document.id)
            version_id = str(version.id)
            try:
                content = _download_version(document, version)
            except Exception as error:
                raise BackupError(f"Could not download document={document_id} version={version_id}.") from error
            actual_hash = hashlib.sha256(content).hexdigest()
            if not version.sha256_hash or actual_hash.lower() != version.sha256_hash.lower():
                raise BackupError(
                    f"SHA-256 mismatch for document={document_id} version={version_id}."
                )
            filename = sanitize_filename(version.original_filename)
            destination = staging_documents / document_id / version_id / filename
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_bytes(content)
            manifest_files.append({
                "document_id": document_id,
                "version_id": version_id,
                "original_filename": version.original_filename,
                "sha256": actual_hash,
                "file_size": len(content),
                "mime_type": version.mime_type,
            })
            document_ids.add(document_id)
            logger.info("Backed up document=%s version=%s sha256_match=true", document_id, version_id)
    return manifest_files, len(document_ids)


def create_backup(db: Session) -> tuple[Path, dict]:
    created_at = datetime.now(timezone.utc)
    timestamp = created_at.strftime("%Y%m%d_%H%M%S")
    backup_filename = f"dms_backup_{timestamp}.zip"
    BACKUPS_ROOT.mkdir(parents=True, exist_ok=True)
    final_path = BACKUPS_ROOT / backup_filename

    with tempfile.TemporaryDirectory(prefix="dms_backup_", dir=BACKUPS_ROOT) as temporary_directory:
        staging_root = Path(temporary_directory)
        staging_documents = staging_root / "documents"
        staging_database = staging_root / "database" / "database_dump.sql"
        documents = db.query(Document).options(selectinload(Document.versions)).order_by(Document.id).all()
        manifest_files, document_count = _backup_versions(staging_documents, documents)
        _database_dump(staging_database)
        manifest = {
            "backup_version": BACKUP_VERSION,
            "created_at": created_at.isoformat(),
            "database": os.getenv("POSTGRES_DB", "dms_db"),
            "document_count": document_count,
            "version_count": len(manifest_files),
            "files": manifest_files,
        }
        (staging_root / "manifest.json").write_text(
            json.dumps(manifest, indent=2), encoding="utf-8"
        )
        temporary_archive = staging_root / backup_filename
        with zipfile.ZipFile(temporary_archive, "w", compression=zipfile.ZIP_DEFLATED) as archive:
            for path in sorted(staging_root.rglob("*")):
                if path.is_file() and path != temporary_archive:
                    archive.write(path, path.relative_to(staging_root).as_posix())
        temporary_archive.replace(final_path)

    logger.info(
        "Backup succeeded filename=%s documents=%s versions=%s integrity_verified=true",
        backup_filename,
        document_count,
        len(manifest_files),
    )
    return final_path, {
        "status": "SUCCESS",
        "backup_filename": backup_filename,
        "backup_path": str(final_path),
        "database_backup": True,
        "documents_backed_up": document_count,
        "versions_backed_up": len(manifest_files),
        "integrity_verified": True,
        "created_at": created_at,
    }