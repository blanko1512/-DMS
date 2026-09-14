from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


DocumentType = Literal[
    "FIR",
    "Investigation Report",
    "Forensic Report",
    "Charge Sheet",
    "Court Order",
    "Statement",
    "Evidence Record",
    "Other",
]


class ClassificationFields(BaseModel):
    model_config = ConfigDict(extra="forbid")

    case_id: str | None = None
    document_date: str | None = None
    person_names: list[str] = Field(default_factory=list)
    department: str | None = None
    officer_name: str | None = None
    location: str | None = None
    reference_number: str | None = None


class ClassificationResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    document_type: DocumentType
    confidence: float = Field(ge=0.0, le=1.0)
    fields: ClassificationFields
    missing_fields: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
