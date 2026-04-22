from sqlalchemy import String, Text, DateTime, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column
from app.db.database import Base
import enum
import uuid
from datetime import datetime, timezone


class AccessRequestStatus(str, enum.Enum):
    NEW = 'new'
    CONTACTED = 'contacted'
    CONVERTED = 'converted'
    CLOSED = 'closed'


class AccessRequest(Base):
    __tablename__ = 'access_requests'

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(150), nullable=False, index=True)
    company: Mapped[str | None] = mapped_column(String(120), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(40), nullable=True)
    message: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[AccessRequestStatus] = mapped_column(SAEnum(AccessRequestStatus), default=AccessRequestStatus.NEW)
    created_at: Mapped[datetime] = mapped_column(default=lambda: datetime.now(timezone.utc))
