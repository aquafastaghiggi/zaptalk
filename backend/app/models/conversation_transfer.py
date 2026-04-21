from datetime import datetime, timezone
import uuid

from sqlalchemy import String, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class ConversationTransferLog(Base):
    __tablename__ = "conversation_transfers"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    conversation_id: Mapped[str] = mapped_column(String, ForeignKey("conversations.id"), nullable=False, index=True)
    created_by_id: Mapped[str | None] = mapped_column(String, ForeignKey("users.id"), nullable=True)
    from_agent_id: Mapped[str | None] = mapped_column(String, ForeignKey("users.id"), nullable=True)
    to_agent_id: Mapped[str | None] = mapped_column(String, ForeignKey("users.id"), nullable=True)
    from_sector_id: Mapped[str | None] = mapped_column(String, ForeignKey("sectors.id"), nullable=True)
    to_sector_id: Mapped[str | None] = mapped_column(String, ForeignKey("sectors.id"), nullable=True)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=lambda: datetime.now(timezone.utc))

    conversation: Mapped["Conversation"] = relationship("Conversation", back_populates="transfer_logs")  # noqa
    created_by: Mapped["User"] = relationship("User", foreign_keys=[created_by_id])  # noqa
    from_agent: Mapped["User"] = relationship("User", foreign_keys=[from_agent_id])  # noqa
    to_agent: Mapped["User"] = relationship("User", foreign_keys=[to_agent_id])  # noqa
    from_sector: Mapped["Sector"] = relationship("Sector", foreign_keys=[from_sector_id])  # noqa
    to_sector: Mapped["Sector"] = relationship("Sector", foreign_keys=[to_sector_id])  # noqa
