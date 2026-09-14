import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    case_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("cases.id"), nullable=False, index=True)
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    storage_path: Mapped[str] = mapped_column(String(1000), nullable=False)
    storage_provider: Mapped[str] = mapped_column(String(50), nullable=False, default="local")
    cloudinary_public_id: Mapped[str | None] = mapped_column(String(1000), unique=True, index=True)
    cloudinary_resource_type: Mapped[str | None] = mapped_column(String(50))
    cloudinary_version: Mapped[int | None] = mapped_column(Integer)
    description: Mapped[str | None] = mapped_column(Text)
    document_type: Mapped[str | None] = mapped_column(String(100))
    department: Mapped[str | None] = mapped_column(String(150))
    sensitivity: Mapped[str | None] = mapped_column(String(50))
    mime_type: Mapped[str | None] = mapped_column(String(150))
    file_size: Mapped[int | None] = mapped_column(Integer)
    sha256_hash: Mapped[str | None] = mapped_column(String(64), index=True)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="active")
    uploaded_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    case: Mapped["Case"] = relationship(back_populates="documents")
    uploader: Mapped["User"] = relationship(back_populates="uploaded_documents")
    versions: Mapped[list["DocumentVersion"]] = relationship(back_populates="document")
    audit_logs: Mapped[list["AuditLog"]] = relationship(back_populates="document")
    transfers: Mapped[list["DocumentTransfer"]] = relationship(back_populates="document")
    custody_records: Mapped[list["ChainOfCustody"]] = relationship(back_populates="document")
    blockchain_records: Mapped[list["BlockchainRecord"]] = relationship(back_populates="document")
