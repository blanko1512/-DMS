from collections.abc import Mapping
from typing import Any

from app.schemas.classification import ClassificationResult
from app.schemas.metadata_validation import MetadataCheck, MetadataValidationResult


COMPARABLE_FIELDS = (
    "case_id",
    "document_date",
    "document_type",
    "department",
    "officer_name",
    "location",
    "reference_number",
)


def _present(value: Any) -> bool:
    if value is None:
        return False
    if isinstance(value, str) and not value.strip():
        return False
    if isinstance(value, (list, dict, tuple, set)):
        return bool(value)
    return True


def _normalise(value: Any) -> str | None:
    if not _present(value):
        return None
    if isinstance(value, list):
        return ", ".join(str(item).strip().casefold() for item in value)
    return str(value).strip().casefold()


def compare_metadata(
    document_id: str,
    metadata: Mapping[str, Any],
    classification: ClassificationResult,
) -> MetadataValidationResult:
    ai_fields = classification.fields.model_dump()
    ai_values = {**ai_fields, "document_type": classification.document_type}
    checks: list[MetadataCheck] = []
    warnings: list[str] = []

    for field in COMPARABLE_FIELDS:
        metadata_value = metadata.get(field)
        ai_value = ai_values.get(field)
        metadata_present = _present(metadata_value)
        ai_present = _present(ai_value)

        if not metadata_present and not ai_present:
            continue
        if metadata_present and ai_present:
            matches = _normalise(metadata_value) == _normalise(ai_value)
            check_status = "MATCH" if matches else "MISMATCH"
            if not matches:
                warnings.append(f"Possible metadata mismatch for field '{field}'. Human review is recommended.")
        else:
            check_status = "NOT_AVAILABLE"

        checks.append(
            MetadataCheck(
                field=field,
                metadata_value=str(metadata_value) if metadata_present else None,
                ai_value=ai_value if ai_present else None,
                status=check_status,
            )
        )

    comparable_checks = [check for check in checks if check.status in {"MATCH", "MISMATCH"}]
    if not comparable_checks:
        overall_status = "NOT_APPLICABLE"
    elif any(check.status == "MISMATCH" for check in checks):
        overall_status = "INCONSISTENT"
    else:
        overall_status = "CONSISTENT"

    return MetadataValidationResult(
        document_id=document_id,
        overall_status=overall_status,
        checks=checks,
        warnings=warnings,
    )
