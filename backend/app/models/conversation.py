from sqlalchemy import String, ForeignKey, Enum as SAEnum, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.database import Base
import enum
import uuid
from datetime import datetime, timezone


class ConversationStatus(str, enum.Enum):
    WAITING = "waiting"      # aguardando atendente
    IN_PROGRESS = "in_progress"  # atendente atribuído
    FINISHED = "finished"    # finalizado


class Conversation(Base):
    __tablename__ = "conversations"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    status: Mapped[ConversationStatus] = mapped_column(
        SAEnum(ConversationStatus), default=ConversationStatus.WAITING, index=True
    )
    contact_id: Mapped[str] = mapped_column(String, ForeignKey("contacts.id"), nullable=False)
    agent_id: Mapped[str | None] = mapped_column(String, ForeignKey("users.id"), nullable=True)
    sector_id: Mapped[str | None] = mapped_column(String, ForeignKey("sectors.id"), nullable=True)
    whatsapp_instance: Mapped[str] = mapped_column(String(100), nullable=False)
    priority: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_pinned: Mapped[bool] = mapped_column(default=False, nullable=False)
    first_response_at: Mapped[datetime | None] = mapped_column(nullable=True)
    unread_count: Mapped[int] = mapped_column(Integer, default=0)
    last_message_at: Mapped[datetime | None] = mapped_column(nullable=True)
    started_at: Mapped[datetime] = mapped_column(default=lambda: datetime.now(timezone.utc))
    finished_at: Mapped[datetime | None] = mapped_column(nullable=True)

    # Relacionamentos
    contact: Mapped["Contact"] = relationship("Contact", back_populates="conversations")  # noqa
    agent: Mapped["User"] = relationship("User", back_populates="conversations")  # noqa
    sector: Mapped["Sector"] = relationship("Sector", back_populates="conversations")  # noqa
    messages: Mapped[list["Message"]] = relationship(  # noqa
        "Message", back_populates="conversation", order_by="Message.created_at"
    )
    notes: Mapped[list["ConversationNote"]] = relationship(  # noqa
        "ConversationNote", back_populates="conversation", order_by="ConversationNote.created_at",
        cascade="all, delete-orphan"
    )
    tags: Mapped[list["ConversationTag"]] = relationship(  # noqa
        "ConversationTag", back_populates="conversation", order_by="ConversationTag.created_at",
        cascade="all, delete-orphan"
    )
    transfer_logs: Mapped[list["ConversationTransferLog"]] = relationship(  # noqa
        "ConversationTransferLog", back_populates="conversation", order_by="ConversationTransferLog.created_at",
        cascade="all, delete-orphan"
    )
