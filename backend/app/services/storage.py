import hashlib
import io
import os
import re
from pathlib import Path

from dotenv import load_dotenv
from fastapi import HTTPException, UploadFile, status

import cloudinary
import cloudinary.api
import cloudinary.uploader

MAX_FILE_SIZE = 20 * 1024 * 1024
ALLOWED_FILES = {
    ".pdf": ("application/pdf", b"%PDF-"),
    ".docx": ("application/vnd.openxmlformats-officedocument.wordprocessingml.document", b"PK"),
    ".jpg": ("image/jpeg", b"\xff\xd8\xff"),
    ".jpeg": ("image/jpeg", b"\xff\xd8\xff"),
    ".png": ("image/png", b"\x89PNG\r\n\x1a\n"),
}


load_dotenv()


def configure_cloudinary() -> None:
    cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME")
    api_key = os.getenv("CLOUDINARY_API_KEY")
    api_secret = os.getenv("CLOUDINARY_API_SECRET")
    if not all((cloud_name, api_key, api_secret)):
        raise RuntimeError(
            "CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET must be set."
        )
    cloudinary.config(cloud_name=cloud_name, api_key=api_key, api_secret=api_secret, secure=True)


def sanitize_filename(filename: str | None) -> str:
    name = Path(filename or "document").name
    name = re.sub(r"[^A-Za-z0-9._-]", "_", name).strip(".")
    return name[:255] or "document"

def validate_file(file: UploadFile, header: bytes) -> str:
    filename = sanitize_filename(file.filename)
    allowed = ALLOWED_FILES.get(Path(filename).suffix.lower())
    if allowed is None:
        raise HTTPException(status_code=400, detail="Unsupported file type. Allowed: PDF, DOCX, JPG, JPEG, PNG.")
    expected_mime, signature = allowed
    if file.content_type != expected_mime:
        raise HTTPException(status_code=400, detail="Invalid MIME type for the file extension.")
    if not header.startswith(signature):
        raise HTTPException(status_code=400, detail="File content does not match its declared type.")
    return filename

def read_and_hash_upload(file: UploadFile) -> tuple[io.BytesIO, str, int]:
    content = io.BytesIO()
    digest = hashlib.sha256()
    size = 0
    while chunk := file.file.read(1024 * 1024):
        size += len(chunk)
        if size > MAX_FILE_SIZE:
            raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="File exceeds the 20 MB limit.")
        digest.update(chunk)
        content.write(chunk)
    content.seek(0)
    return content, digest.hexdigest(), size

def upload_to_cloudinary(content: io.BytesIO, case_id: str, document_id: str) -> dict:
    configure_cloudinary()
    public_id = f"DMS/documents/{case_id}/{document_id}"
    try:
        return cloudinary.uploader.upload(
            content,
            public_id=public_id,
            resource_type="raw",
            type="authenticated",
            use_filename=False,
            unique_filename=False,
            overwrite=False,
        )
    except Exception as error:
        raise HTTPException(status_code=502, detail="Cloudinary upload failed.") from error

def delete_from_cloudinary(public_id: str, resource_type: str = "raw") -> None:
    configure_cloudinary()
    try:
        cloudinary.uploader.destroy(public_id, resource_type=resource_type, type="authenticated")
    except Exception:
        pass

def verify_cloudinary_resource(public_id: str, resource_type: str = "raw") -> dict:
    configure_cloudinary()
    try:
        return cloudinary.api.resource(public_id, resource_type=resource_type, type="authenticated")
    except Exception as error:
        raise HTTPException(status_code=502, detail="Cloudinary document could not be retrieved by the backend.") from error


