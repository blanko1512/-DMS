import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, String, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(50), nullable=False, default="user")
    department: Mapped[str | None] = mapped_column(String(150))
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    created_cases: Mapped[list["Case"]] = relationship(back_populates="creator")
    uploaded_documents: Mapped[list["Document"]] = relationship(back_populates="uploader")
    uploaded_versions: Mapped[list["DocumentVersion"]] = relationship(back_populates="uploader")
    audit_logs: Mapped[list["AuditLog"]] = relationship(back_populates="user")
    sent_transfers: Mapped[list["DocumentTransfer"]] = relationship(
        back_populates="from_user", foreign_keys="DocumentTransfer.from_user_id"
    )
    received_transfers: Mapped[list["DocumentTransfer"]] = relationship(
        back_populates="to_user", foreign_keys="DocumentTransfer.to_user_id"
    )
    sent_custody_records: Mapped[list["ChainOfCustody"]] = relationship(
        back_populates="from_user", foreign_keys="ChainOfCustody.from_user_id"
    )
    received_custody_records: Mapped[list["ChainOfCustody"]] = relationship(
        back_populates="to_user", foreign_keys="ChainOfCustody.to_user_id"
    )
