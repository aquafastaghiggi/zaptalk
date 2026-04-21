from sqlalchemy import String, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.database import Base
import uuid
from datetime import datetime, timezone


class Sector(Base):
    __tablename__ = "sectors"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(default=lambda: datetime.now(timezone.utc))

    # Relacionamentos
    agents: Mapped[list["User"]] = relationship("User", back_populates="sector")  # noqa
    conversations: Mapped[list["Conversation"]] = relationship("Conversation", back_populates="sector")  # noqa
