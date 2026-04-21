from sqlalchemy import String, ForeignKey, Enum as SAEnum, Text, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.database import Base
import enum
import uuid
from datetime import datetime, timezone


class MessageDirection(str, enum.Enum):
    INBOUND = "inbound"    # cliente → sistema
    OUTBOUND = "outbound"  # sistema → cliente


class MessageType(str, enum.Enum):
    TEXT = "text"
    IMAGE = "image"
    AUDIO = "audio"
    VIDEO = "video"
    DOCUMENT = "document"
    STICKER = "sticker"


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    conversation_id: Mapped[str] = mapped_column(
        String, ForeignKey("conversations.id"), nullable=False, index=True
    )
    sender_id: Mapped[str | None] = mapped_column(String, ForeignKey("users.id"), nullable=True)
    direction: Mapped[MessageDirection] = mapped_column(SAEnum(MessageDirection), nullable=False)
    message_type: Mapped[MessageType] = mapped_column(SAEnum(MessageType), default=MessageType.TEXT)
    content: Mapped[str | None] = mapped_column(Text, nullable=True)
    media_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    whatsapp_message_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(
        default=lambda: datetime.now(timezone.utc), index=True
    )

    conversation: Mapped["Conversation"] = relationship("Conversation", back_populates="messages")  # noqa
    sender: Mapped["User"] = relationship("User")  # noqa
