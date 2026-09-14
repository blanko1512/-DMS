import json
import os
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from dotenv import load_dotenv
from fastapi import HTTPException
from app.schemas.classification import ClassificationResult


load_dotenv()
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434").rstrip("/")


def get_ollama_model() -> str:
    model = os.getenv("OLLAMA_MODEL", "").strip()
    if not model:
        raise HTTPException(status_code=503, detail="No Ollama model is configured. Install a model and set OLLAMA_MODEL in backend/.env.")
    return model


def generate(prompt: str, json_mode: bool | dict = False) -> str:
    model = get_ollama_model()
    payload = {"model": model, "prompt": prompt, "stream": False}
    if json_mode:
        payload["format"] = json_mode if isinstance(json_mode, dict) else "json"
    request = Request(f"{OLLAMA_BASE_URL}/api/generate", data=json.dumps(payload).encode(), headers={"Content-Type": "application/json"}, method="POST")
    try:
        with urlopen(request, timeout=60) as response:
            result = json.loads(response.read())
        text = (result.get("response") or result.get("thinking") or "").strip()
        if not text:
            raise ValueError("Ollama returned an empty response")
        return text
    except (HTTPError, URLError, TimeoutError, OSError) as error:
        raise HTTPException(status_code=503, detail="The local Ollama server is unavailable. Start Ollama and try again.") from error
    except (json.JSONDecodeError, ValueError) as error:
        raise HTTPException(status_code=502, detail="Ollama returned an invalid response.") from error


def get_health() -> dict:
    model = get_ollama_model()
    try:
        with urlopen(Request(f"{OLLAMA_BASE_URL}/api/tags"), timeout=10) as response:
            json.loads(response.read())
        return {"status": "ok", "provider": "ollama", "model": model}
    except (HTTPError, URLError, TimeoutError, OSError) as error:
        raise HTTPException(status_code=503, detail="The local Ollama server is not running.") from error


def simple_connection_test() -> str:
    return generate("Reply with exactly: Ollama connection successful")


def simple_json_test() -> dict:
    response = generate('Return only JSON with keys "name" and "type". Set name to "Test" and type to "Document".', json_mode=True)
    try:
        result = json.loads(response)
        if not isinstance(result, dict) or result.get("name") != "Test" or result.get("type") != "Document":
            raise ValueError("Unexpected JSON values")
        return result
    except (json.JSONDecodeError, ValueError) as error:
        raise HTTPException(status_code=502, detail="Ollama did not return the expected JSON test object.") from error


MAX_CLASSIFICATION_TEXT_LENGTH = 12000


def prepare_classification_text(text: str) -> tuple[str, bool]:
    if len(text) <= MAX_CLASSIFICATION_TEXT_LENGTH:
        return text, False
    beginning = MAX_CLASSIFICATION_TEXT_LENGTH * 2 // 3
    ending = MAX_CLASSIFICATION_TEXT_LENGTH - beginning
    return text[:beginning] + "\n\n[TEXT TRUNCATED FOR AI INPUT]\n\n" + text[-ending:], True


def build_classification_prompt(document_text: str, truncated: bool) -> str:
    truncation_note = "The text was truncated. Treat omitted information as unknown." if truncated else "The text is complete."
    return f"""You are an AI-assisted document classification and information extraction assistant.
Classify the text into exactly one of: FIR, Investigation Report, Forensic Report, Charge Sheet, Court Order, Statement, Evidence Record, Other.
Return only JSON with exactly these keys: document_type, confidence, fields, missing_fields, warnings.
Confidence must be a number from 0.0 to 1.0 and means AI classification confidence only, not authenticity.
Fields must contain only these keys: case_id, document_date, person_names, department, officer_name, location, reference_number.
Use null or [] when a value is not explicitly present. Never invent values.
Put the names of fields that are not explicitly present in missing_fields.
Use Other with low confidence when uncertain. Do not make legal decisions and never claim the document is authentic, genuine, forged, or legally valid.
Report uncertainty or possible inconsistencies as warnings only.
{truncation_note}

Document text:
---
{document_text}
---"""


def parse_json_response(response: str) -> dict:
    cleaned = response.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("\n", 1)[1] if "\n" in cleaned else cleaned
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3].rstrip()
    try:
        parsed, _ = json.JSONDecoder().raw_decode(cleaned)
    except (json.JSONDecodeError, TypeError) as error:
        raise HTTPException(status_code=502, detail="Ollama returned invalid JSON for classification.") from error
    if not isinstance(parsed, dict):
        raise HTTPException(status_code=502, detail="Ollama classification response must be a JSON object.")
    return parsed


def classify_text(document_text: str) -> tuple[ClassificationResult, bool, str]:
    if not document_text.strip():
        raise HTTPException(status_code=422, detail="No readable text is available. Run text extraction first.")
    prepared_text, truncated = prepare_classification_text(document_text)
    response = generate(
        build_classification_prompt(prepared_text, truncated),
        json_mode=ClassificationResult.model_json_schema(),
    )
    try:
        result = ClassificationResult.model_validate(parse_json_response(response))
    except (ValueError, TypeError) as error:
        raise HTTPException(status_code=502, detail="Ollama returned an invalid classification response.") from error
    if truncated:
        result.warnings.append("AI input was truncated to a safe maximum length.")
    return result, truncated, get_ollama_model()