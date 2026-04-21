from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models.conversation import ConversationStatus
from app.models.message import MessageDirection, MessageType
from app.schemas.user import UserOut


class ContactOut(BaseModel):
    id: str
    phone: str
    name: Optional[str] = None
    profile_picture: Optional[str] = None
    company: Optional[str] = None
    origin: Optional[str] = None
    stage: Optional[str] = None
    responsible_user_id: Optional[str] = None

    model_config = {"from_attributes": True}


class SectorOut(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    routing_keywords: Optional[str] = None
    is_active: bool

    model_config = {"from_attributes": True}


class MessageOut(BaseModel):
    id: str
    conversation_id: str
    direction: MessageDirection
    message_type: MessageType
    content: Optional[str] = None
    media_url: Optional[str] = None
    sender_id: Optional[str] = None
    is_read: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class ConversationOut(BaseModel):
    id: str
    status: ConversationStatus
    contact: ContactOut
    agent: Optional[UserOut] = None
    sector: Optional[SectorOut] = None
    sector_id: Optional[str] = None
    priority: int = 0
    is_pinned: bool = False
    unread_count: int
    last_message_at: Optional[datetime] = None
    started_at: datetime

    model_config = {"from_attributes": True}


class AssignAgentRequest(BaseModel):
    agent_id: str


class TransferRequest(BaseModel):
    agent_id: Optional[str] = None
    sector_id: Optional[str] = None
    reason: Optional[str] = None


class SendMessageRequest(BaseModel):
    content: str
    message_type: MessageType = MessageType.TEXT


class PriorityUpdateRequest(BaseModel):
    priority: int


class ConversationNoteCreate(BaseModel):
    content: str


class ConversationNoteOut(BaseModel):
    id: str
    content: str
    is_internal: bool
    created_at: datetime
    created_by: Optional[UserOut] = None

    model_config = {"from_attributes": True}


class ConversationTagCreate(BaseModel):
    label: str


class ConversationTagOut(BaseModel):
    id: str
    label: str
    created_at: datetime
    created_by: Optional[UserOut] = None

    model_config = {"from_attributes": True}


class ConversationTransferOut(BaseModel):
    id: str
    from_agent_id: Optional[str] = None
    to_agent_id: Optional[str] = None
    from_sector_id: Optional[str] = None
    to_sector_id: Optional[str] = None
    reason: Optional[str] = None
    created_at: datetime
    created_by: Optional[UserOut] = None

    model_config = {"from_attributes": True}


class ConversationMetaOut(BaseModel):
    notes: list[ConversationNoteOut]
    tags: list[ConversationTagOut]
    transfers: list[ConversationTransferOut]


class QuickReplyCreate(BaseModel):
    title: str
    shortcut: str
    content: str
    sector_id: Optional[str] = None
    is_active: bool = True


class QuickReplyUpdate(BaseModel):
    title: Optional[str] = None
    shortcut: Optional[str] = None
    content: Optional[str] = None
    sector_id: Optional[str] = None
    is_active: Optional[bool] = None


class QuickReplyOut(BaseModel):
    id: str
    title: str
    shortcut: str
    content: str
    sector_id: Optional[str] = None
    is_active: bool
    created_at: datetime
    created_by: Optional[UserOut] = None

    model_config = {"from_attributes": True}
