from datetime import datetime, timezone
import uuid

from sqlalchemy import String, ForeignKey, Text, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class QuickReply(Base):
    __tablename__ = "quick_replies"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title: Mapped[str] = mapped_column(String(120), nullable=False)
    shortcut: Mapped[str] = mapped_column(String(60), nullable=False, index=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    sector_id: Mapped[str | None] = mapped_column(String, ForeignKey("sectors.id"), nullable=True, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_by_id: Mapped[str | None] = mapped_column(String, ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=lambda: datetime.now(timezone.utc))

    sector: Mapped["Sector"] = relationship("Sector")  # noqa
    created_by: Mapped["User"] = relationship("User")  # noqa
