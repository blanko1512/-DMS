import hashlib
import json
import logging
import mimetypes
import os
import re
import shutil
import subprocess
import tempfile
import uuid
import zipfile
from pathlib import Path

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.services.storage import sanitize_filename


logger = logging.getLogger(__name__)
BACKEND_ROOT = Path(__file__).resolve().parents[2]
RESTORE_ROOT = BACKEND_ROOT / "restore-tests"
TABLES = (
    "users",
    "cases",
    "documents",
    "document_versions",
    "audit_logs",
    "document_transfers",
    "chain_of_custody",
    "blockchain_records",
    "shares",
)


class RestoreVerificationError(Exception):
    pass


def _postgres_tool(name: str) -> str:
    configured = os.getenv(f"{name.upper()}_PATH")
    if configured:
        return configured
    discovered = shutil.which(name)
    if discovered:
        return discovered
    standard_path = Path(os.environ.get("ProgramFiles", r"C:\Program Files")) / "PostgreSQL"
    candidates = sorted(standard_path.glob(f"*/bin/{name}.exe"), reverse=True)
    if candidates:
        return str(candidates[0])
    raise RestoreVerificationError(f"PostgreSQL {name} was not found.")


def _connection_args(database: str) -> list[str]:
    return [
        "--host",
        os.getenv("POSTGRES_HOST", "localhost"),
        "--port",
        os.getenv("POSTGRES_PORT", "5432"),
        "--username",
        os.getenv("POSTGRES_USER", "postgres"),
        "--dbname",
        database,
    ]


def _run_postgres(command: list[str], timeout: int = 300) -> subprocess.CompletedProcess:
    child_environment = os.environ.copy()
    child_environment["PGPASSWORD"] = os.getenv("POSTGRES_PASSWORD", "")
    return subprocess.run(
        command,
        env=child_environment,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=False,
        timeout=timeout,
    )


def _validate_manifest(archive: zipfile.ZipFile) -> dict:
    names = set(archive.namelist())
    required = {"manifest.json", "database/database_dump.sql"}
    missing = required - names
    if missing:
        raise RestoreVerificationError(f"Backup is missing required entries: {', '.join(sorted(missing))}.")
    if not any(name.startswith("documents/") and not name.endswith("/") for name in names):
        raise RestoreVerificationError("Backup documents directory is missing or empty.")
    try:
        manifest = json.loads(archive.read("manifest.json"))
    except (UnicodeDecodeError, json.JSONDecodeError, KeyError) as error:
        raise RestoreVerificationError("manifest.json is not valid JSON.") from error
    if not isinstance(manifest, dict) or not isinstance(manifest.get("files"), list):
        raise RestoreVerificationError("manifest.json has an invalid files collection.")
    document_count = manifest.get("document_count")
    version_count = manifest.get("version_count")
    if not isinstance(document_count, int) or document_count < 0:
        raise RestoreVerificationError("manifest document_count is invalid.")
    if not isinstance(version_count, int) or version_count < 0:
        raise RestoreVerificationError("manifest version_count is invalid.")

    seen_versions: set[tuple[str, str]] = set()
    seen_documents: set[str] = set()
    hex_pattern = re.compile(r"^[0-9a-fA-F]{64}$")
    for entry in manifest["files"]:
        if not isinstance(entry, dict):
            raise RestoreVerificationError("A manifest file entry is invalid.")
        required_fields = {"document_id", "version_id", "original_filename", "sha256", "file_size", "mime_type"}
        if not required_fields.issubset(entry):
            raise RestoreVerificationError("A manifest file entry is missing required fields.")
        document_id = str(entry["document_id"])
        version_id = str(entry["version_id"])
        try:
            uuid.UUID(document_id)
            uuid.UUID(version_id)
        except ValueError as error:
            raise RestoreVerificationError("A manifest document or version ID is invalid.") from error
        key = (document_id, version_id)
        if key in seen_versions:
            raise RestoreVerificationError("Manifest contains a duplicate document/version entry.")
        seen_versions.add(key)
        seen_documents.add(document_id)
        if not isinstance(entry["original_filename"], str) or not entry["original_filename"]:
            raise RestoreVerificationError("A manifest filename is invalid.")
        if sanitize_filename(entry["original_filename"]) != Path(entry["original_filename"]).name:
            raise RestoreVerificationError("A manifest filename is unsafe or does not match the archive layout.")
        if not isinstance(entry["file_size"], int) or entry["file_size"] < 0:
            raise RestoreVerificationError("A manifest file size is invalid.")
        if not isinstance(entry["sha256"], str) or not hex_pattern.fullmatch(entry["sha256"]):
            raise RestoreVerificationError("A manifest SHA-256 value is invalid.")
        archive_name = f"documents/{document_id}/{version_id}/{entry['original_filename']}"
        if archive_name not in names:
            raise RestoreVerificationError(f"Manifest file is missing from the archive for version={version_id}.")
        content = archive.read(archive_name)
        if len(content) != entry["file_size"]:
            raise RestoreVerificationError(f"File size mismatch for version={version_id}.")
        actual_hash = hashlib.sha256(content).hexdigest()
        if actual_hash.lower() != entry["sha256"].lower():
            raise RestoreVerificationError(f"SHA-256 mismatch for version={version_id}.")
        guessed_mime, _ = mimetypes.guess_type(entry["original_filename"])
        if guessed_mime and entry["mime_type"] and guessed_mime.lower() != str(entry["mime_type"]).lower():
            raise RestoreVerificationError(f"MIME type mismatch for version={version_id}.")
    if document_count != len(seen_documents):
        raise RestoreVerificationError("manifest document_count does not match its entries.")
    if version_count != len(seen_versions):
        raise RestoreVerificationError("manifest version_count does not match its entries.")
    return manifest


def _source_counts(db: Session) -> dict[str, int | None]:
    counts: dict[str, int | None] = {}
    for table in TABLES:
        exists = db.execute(text("SELECT to_regclass(:table) IS NOT NULL"), {"table": f"public.{table}"}).scalar()
        counts[table] = int(db.execute(text(f"SELECT COUNT(*) FROM {table}")).scalar()) if exists else None
    return counts


def _create_database(database_name: str) -> None:
    quoted_name = '"' + database_name.replace('"', '""') + '"'
    result = _run_postgres([_postgres_tool("psql"), *_connection_args("postgres"), "--command", f"CREATE DATABASE {quoted_name}"])
    if result.returncode != 0:
        raise RestoreVerificationError("Could not create the isolated restore database.")


def _drop_database(database_name: str) -> None:
    quoted_name = '"' + database_name.replace('"', '""') + '"'
    result = _run_postgres([_postgres_tool("psql"), *_connection_args("postgres"), "--command", f"DROP DATABASE IF EXISTS {quoted_name}"])
    if result.returncode != 0:
        logger.error("Temporary restore database cleanup failed database=%s", database_name)


def _restore_database(database_name: str, dump_path: Path) -> None:
    result = _run_postgres(
        [_postgres_tool("psql"), *_connection_args(database_name), "--set", "ON_ERROR_STOP=1", "--file", str(dump_path)],
        timeout=600,
    )
    if result.returncode != 0:
        raise RestoreVerificationError("Database restoration into the isolated database failed.")


def _restored_counts(database_name: str) -> dict[str, int | None]:
    counts: dict[str, int | None] = {}
    for table in TABLES:
        exists_result = _run_postgres(
            [
                _postgres_tool("psql"),
                *_connection_args(database_name),
                "--tuples-only",
                "--no-align",
                "--command",
                f"SELECT to_regclass('public.{table}') IS NOT NULL",
            ]
        )
        if exists_result.returncode != 0:
            raise RestoreVerificationError("Could not read counts from the isolated restored database.")
        if exists_result.stdout.strip().lower() != "t":
            counts[table] = None
            continue
        count_result = _run_postgres(
            [_postgres_tool("psql"), *_connection_args(database_name), "--tuples-only", "--no-align", "--command", f"SELECT COUNT(*) FROM public.{table}"]
        )
        if count_result.returncode != 0:
            raise RestoreVerificationError("Could not read counts from the isolated restored database.")
        counts[table] = int(count_result.stdout.strip())
    return counts


def _extract_documents(archive: zipfile.ZipFile, manifest: dict, destination: Path) -> int:
    extracted = 0
    for entry in manifest["files"]:
        filename = sanitize_filename(entry["original_filename"])
        output = destination / entry["document_id"] / entry["version_id"] / filename
        output.parent.mkdir(parents=True, exist_ok=True)
        content = archive.read(f"documents/{entry['document_id']}/{entry['version_id']}/{entry['original_filename']}")
        output.write_bytes(content)
        if hashlib.sha256(content).hexdigest().lower() != entry["sha256"].lower() or len(content) != entry["file_size"]:
            raise RestoreVerificationError(f"Extracted file verification failed for version={entry['version_id']}.")
        extracted += 1
    return extracted


def verify_backup_restore(db: Session, backup_path: Path) -> dict:
    source_counts = _source_counts(db)
    temporary_database = f"dms_restore_test_{uuid.uuid4().hex[:12]}"
    database_restored = False
    database_name = temporary_database
    try:
        if not backup_path.is_file():
            raise RestoreVerificationError("Backup ZIP does not exist.")
        with zipfile.ZipFile(backup_path) as archive:
            manifest = _validate_manifest(archive)
            with tempfile.TemporaryDirectory(prefix="dms_restore_files_") as extracted_directory:
                extracted_count = _extract_documents(archive, manifest, Path(extracted_directory))
                dump_path = Path(extracted_directory) / "database_dump.sql"
                dump_path.write_bytes(archive.read("database/database_dump.sql"))
                _create_database(temporary_database)
                _restore_database(temporary_database, dump_path)
                database_restored = True
                restored_counts = _restored_counts(temporary_database)
        database_counts_match = all(
            source_counts[table] is None or restored_counts.get(table) == source_counts[table]
            for table in TABLES
        )
        if restored_counts.get("documents") != manifest["document_count"] or restored_counts.get("document_versions") != manifest["version_count"]:
            database_counts_match = False
        if not database_counts_match:
            raise RestoreVerificationError("Restored database counts do not match the source backup data.")
        logger.info(
            "Restore verification succeeded database=%s documents=%s versions=%s cloudinary_modified=false",
            temporary_database,
            manifest["document_count"],
            manifest["version_count"],
        )
        return {
            "status": "SUCCESS",
            "backup_valid": True,
            "database_restored": True,
            "database_name": database_name,
            "documents_extracted": extracted_count,
            "versions_verified": manifest["version_count"],
            "integrity_verified": True,
            "database_counts_match": True,
            "database_counts": restored_counts,
            "cloudinary_modified": False,
        }
    except (RestoreVerificationError, zipfile.BadZipFile) as error:
        logger.error("Restore verification failed database=%s reason=%s", temporary_database, error)
        return {
            "status": "FAILED",
            "backup_valid": False,
            "database_restored": database_restored,
            "database_name": database_name,
            "documents_extracted": 0,
            "versions_verified": 0,
            "integrity_verified": False,
            "database_counts_match": False,
            "database_counts": {},
            "cloudinary_modified": False,
            "error": str(error),
        }
    finally:
        if database_restored or temporary_database:
            _drop_database(temporary_database)