import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class BlockchainProofResponse(BaseModel):
    document_id: uuid.UUID
    version_id: uuid.UUID | None
    sha256: str
    proof_hash: str
    blockchain_status: str
    network: str
    transaction_hash: str
    recorded_at: datetime


class BlockchainVerifyResponse(BaseModel):
    document_id: uuid.UUID
    version_id: uuid.UUID | None
    integrity_status: str
    current_sha256: str
    blockchain_proof: str | None
    transaction_hash: str | None
    network: str | None = None