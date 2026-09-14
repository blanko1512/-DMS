from typing import Any

from app.schemas.classification import ClassificationResult


REQUIRED_FIELDS: dict[str, list[str]] = {
    "FIR": ["case_id", "document_date", "location", "officer_name", "reference_number"],
    "Investigation Report": ["case_id", "document_date", "officer_name", "reference_number"],
    "Forensic Report": ["case_id", "document_date", "officer_name", "reference_number"],
    "Charge Sheet": ["case_id", "document_date", "reference_number"],
    "Court Order": ["case_id", "document_date", "reference_number"],
    "Statement": ["case_id", "document_date", "person_names", "officer_name"],
    "Evidence Record": ["case_id", "document_date", "reference_number", "location"],
    "Other": [],
}


def is_present(value: Any) -> bool:
    if value is None:
        return False
    if isinstance(value, str) and not value.strip():
        return False
    if isinstance(value, (list, dict, tuple, set)) and not value:
        return False
    return True


def validate_required_fields(result: ClassificationResult) -> dict[str, Any]:
    document_type = result.document_type
    required_fields = REQUIRED_FIELDS[document_type]
    if document_type == "Other":
        return {
            "document_type": document_type,
            "validation_status": "NOT_APPLICABLE",
            "required_fields": [],
            "present_fields": [],
            "missing_fields": [],
            "warnings": ["Required-field validation does not apply to documents classified as Other."],
        }

    fields = result.fields.model_dump()
    present_fields = [field for field in required_fields if is_present(fields.get(field))]
    missing_fields = [field for field in required_fields if field not in present_fields]
    return {
        "document_type": document_type,
        "validation_status": "COMPLETE" if not missing_fields else "INCOMPLETE",
        "required_fields": required_fields,
        "present_fields": present_fields,
        "missing_fields": missing_fields,
        "warnings": [
            "Required application-level fields are missing. Human review is recommended."
        ] if missing_fields else [],
    }
