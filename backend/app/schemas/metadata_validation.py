from typing import Literal

from pydantic import BaseModel, ConfigDict


CheckStatus = Literal[
    "MATCH",
    "MISMATCH",
    "NOT_AVAILABLE",
]
OverallStatus = Literal[
    "CONSISTENT",
    "INCONSISTENT",
    "NOT_APPLICABLE",
]


class MetadataCheck(BaseModel):
    model_config = ConfigDict(extra="forbid")

    field: str
    metadata_value: str | None
    ai_value: str | list[str] | None
    status: CheckStatus


class MetadataValidationResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    document_id: str
    overall_status: OverallStatus
    checks: list[MetadataCheck]
    warnings: list[str]
