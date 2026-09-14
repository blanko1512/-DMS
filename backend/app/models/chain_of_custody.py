import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String, Text, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.document import Document
    from app.models.user import User


class ChainOfCustody(Base):
    __tablename__ = "chain_of_custody"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("documents.id"), nullable=False, index=True)
    from_user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"))
    to_user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"))
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="PENDING")
    reason: Mapped[str | None] = mapped_column(String(500))
    related_transfer_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), index=True)
    version_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("document_versions.id"), index=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    remarks: Mapped[str | None] = mapped_column(Text)

    document: Mapped["Document"] = relationship(back_populates="custody_records")
    from_user: Mapped["User | None"] = relationship(
        back_populates="sent_custody_records", foreign_keys=[from_user_id]
    )
    to_user: Mapped["User | None"] = relationship(
        back_populates="received_custody_records", foreign_keys=[to_user_id]
    )
