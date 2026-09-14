import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class BlockchainRecord(Base):
    __tablename__ = "blockchain_records"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("documents.id"), nullable=False, index=True)
    version_number: Mapped[int] = mapped_column(Integer, nullable=False)
    version_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("document_versions.id"), index=True)
    sha256_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    proof_hash: Mapped[str] = mapped_column(String(66), nullable=False)
    transaction_id: Mapped[str | None] = mapped_column(String(255))
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    network: Mapped[str | None] = mapped_column(String(100))
    verification_status: Mapped[str] = mapped_column(String(50), nullable=False, default="ANCHORED")

    document: Mapped["Document"] = relationship(back_populates="blockchain_records")
