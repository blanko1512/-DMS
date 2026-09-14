import io
from dataclasses import dataclass
from urllib.error import HTTPError, URLError
from urllib.request import urlopen

import pymupdf as fitz
import pytesseract
from fastapi import HTTPException
from PIL import Image
from pytesseract import TesseractNotFoundError

from app.services.storage import configure_cloudinary
import cloudinary.api
from cloudinary.utils import private_download_url


MEANINGFUL_TEXT_MINIMUM = 20


@dataclass
class ExtractionResult:
    method: str
    page_count: int
    text: str


def download_cloudinary_document(public_id: str, resource_type: str) -> bytes:
    configure_cloudinary()
    try:
        resource = cloudinary.api.resource(public_id, resource_type=resource_type, type="authenticated")
        file_format = resource.get("format") or "pdf"
        download_url = private_download_url(
            public_id,
            file_format,
            resource_type=resource_type,
            type="authenticated",
            secure=True,
        )
        with urlopen(download_url, timeout=30) as response:
            return response.read()
    except (HTTPError, URLError, OSError, KeyError) as error:
        raise HTTPException(status_code=502, detail="The document could not be retrieved from Cloudinary.") from error


def extract_text_from_pdf(pdf_bytes: bytes) -> ExtractionResult:
    try:
        pdf = fitz.open(stream=pdf_bytes, filetype="pdf")
    except Exception as error:
        raise HTTPException(status_code=422, detail="The document is not a valid or readable PDF.") from error

    page_count = len(pdf)
    page_texts = [page.get_text("text").strip() for page in pdf]
    digital_text = "\n\n".join(f"--- Page {number} ---\n{text}" for number, text in enumerate(page_texts, 1) if text)
    if len(digital_text.strip()) >= MEANINGFUL_TEXT_MINIMUM:
        pdf.close()
        return ExtractionResult("pdf_text", page_count, digital_text)

    try:
        ocr_pages = []
        for page in pdf:
            pixmap = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
            image = Image.open(io.BytesIO(pixmap.tobytes("png")))
            text = pytesseract.image_to_string(image).strip()
            ocr_pages.append(f"--- Page {page.number + 1} ---\n{text}")
        pdf.close()
        ocr_text = "\n\n".join(ocr_pages)
        return ExtractionResult("ocr", page_count, ocr_text)
    except TesseractNotFoundError as error:
        pdf.close()
        raise HTTPException(status_code=503, detail="OCR requires Tesseract. Install it and verify with: tesseract --version") from error
    except Exception as error:
        pdf.close()
        raise HTTPException(status_code=502, detail="OCR processing failed for this PDF.") from error