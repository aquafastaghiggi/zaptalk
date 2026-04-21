from fastapi import APIRouter, Depends, Query, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import Optional, List
from datetime import date
from pathlib import Path
import uuid

from app.db.database import get_db
from app.core.deps import get_current_user
from app.models.user import User, UserRole
from app.models.conversation import Conversation, ConversationStatus
from app.models.message import Message, MessageType
from app.models.conversation_tag import ConversationTag
from app.models.contact import Contact
from app.schemas.conversation import (
    ConversationOut, MessageOut,
    AssignAgentRequest, TransferRequest, SendMessageRequest,
    PriorityUpdateRequest,
    ConversationMetaOut, ConversationNoteCreate, ConversationTagCreate,
)
from app.services import conversation_service as svc
from app.services.quick_reply_service import list_quick_reply_filters

router = APIRouter(prefix="/conversations", tags=["conversations"])


@router.get("", response_model=List[ConversationOut])
async def list_conversations(
    status: Optional[ConversationStatus] = Query(None),
    sector_id: Optional[str] = Query(None),
    agent_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    tag: Optional[str] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    pinned: Optional[bool] = Query(None),
    unread: Optional[bool] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Atendentes veem apenas suas próprias conversas
    effective_agent_id = agent_id
    if current_user.role == UserRole.AGENT:
        effective_agent_id = current_user.id

    return await svc.list_conversations(
        db,
        status=status,
        agent_id=effective_agent_id,
        sector_id=sector_id,
        search=search,
        tag=tag,
        date_from=date_from,
        date_to=date_to,
        pinned=pinned,
        unread=unread,
    )


@router.get("/filters")
async def get_filters(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    agents_result = await db.execute(
        select(User).where(User.role == UserRole.AGENT, User.is_active == True).options(selectinload(User.sector))  # noqa: E712
    )
    agents = agents_result.scalars().all()
    tags_result = await db.execute(
        select(ConversationTag.label)
        .group_by(ConversationTag.label)
        .order_by(func.lower(ConversationTag.label))
    )
    tags = [row[0] for row in tags_result.fetchall()]
    quick_reply_filters = await list_quick_reply_filters(db)
    return {
        "agents": [
            {
                "id": agent.id,
                "name": agent.name,
                "sector_id": agent.sector_id,
                "sector_name": agent.sector.name if agent.sector else None,
            }
            for agent in agents
        ],
        "tags": tags,
        "sectors": quick_reply_filters["sectors"],
    }


@router.get("/{conversation_id}/messages", response_model=List[MessageOut])
async def get_messages(
    conversation_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.asc())
    )
    return result.scalars().all()


@router.get("/{conversation_id}/meta", response_model=ConversationMetaOut)
async def get_meta(
    conversation_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await svc.get_conversation_meta(db, conversation_id)


@router.get("/{conversation_id}/history")
async def get_history(
    conversation_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await svc.list_transfer_history(db, conversation_id)


@router.post("/{conversation_id}/assign")
async def assign(
    conversation_id: str,
    body: AssignAgentRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conv = await svc.assign_agent(db, conversation_id, body.agent_id, created_by=current_user)
    return {"ok": True, "conversation_id": conv.id, "status": conv.status}


@router.post("/{conversation_id}/transfer")
async def transfer(
    conversation_id: str,
    body: TransferRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conv = await svc.transfer_conversation(
        db,
        conversation_id,
        body.agent_id,
        body.sector_id,
        reason=body.reason,
        created_by=current_user,
    )
    return {"ok": True, "conversation_id": conv.id}


@router.post("/{conversation_id}/requeue")
async def requeue(
    conversation_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conv = await svc.requeue_conversation(db, conversation_id, created_by=current_user)
    return {"ok": True, "conversation_id": conv.id, "status": conv.status}


@router.post("/{conversation_id}/priority")
async def update_priority(
    conversation_id: str,
    body: PriorityUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conv = await svc.set_conversation_priority(
        db,
        conversation_id,
        body.priority,
        created_by=current_user,
    )
    return {"ok": True, "conversation_id": conv.id, "priority": conv.priority}


@router.post("/{conversation_id}/pin")
async def pin(
    conversation_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conv = await svc.toggle_conversation_pin(db, conversation_id, created_by=current_user)
    return {"ok": True, "conversation_id": conv.id, "is_pinned": conv.is_pinned}


@router.post("/{conversation_id}/mark-unread")
async def mark_unread(
    conversation_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conv = await svc.mark_conversation_unread(db, conversation_id, created_by=current_user)
    return {"ok": True, "conversation_id": conv.id, "unread_count": conv.unread_count}


@router.post("/{conversation_id}/reopen")
async def reopen(
    conversation_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conv = await svc.reopen_conversation(db, conversation_id, created_by=current_user)
    return {"ok": True, "conversation_id": conv.id, "status": conv.status}


@router.post("/{conversation_id}/notes")
async def add_note(
    conversation_id: str,
    body: ConversationNoteCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    note = await svc.add_conversation_note(db, conversation_id, body.content, current_user)
    return {"ok": True, "note": {"id": note.id, "content": note.content}}


@router.delete("/{conversation_id}/notes/{note_id}")
async def delete_note(
    conversation_id: str,
    note_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await svc.remove_conversation_note(db, conversation_id, note_id, created_by=current_user)
    return {"ok": True}


@router.post("/{conversation_id}/tags")
async def add_tag(
    conversation_id: str,
    body: ConversationTagCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tag = await svc.add_conversation_tag(db, conversation_id, body.label, current_user)
    return {"ok": True, "tag": {"id": tag.id, "label": tag.label}}


@router.delete("/{conversation_id}/tags/{tag_id}")
async def delete_tag(
    conversation_id: str,
    tag_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await svc.remove_conversation_tag(db, conversation_id, tag_id, created_by=current_user)
    return {"ok": True}


@router.post("/{conversation_id}/finish")
async def finish(
    conversation_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conv = await svc.finish_conversation(db, conversation_id, created_by=current_user)
    return {"ok": True, "conversation_id": conv.id, "status": conv.status}


@router.post("/{conversation_id}/messages", response_model=MessageOut, status_code=201)
async def send_message(
    conversation_id: str,
    body: SendMessageRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    msg = await svc.send_message(db, conversation_id, current_user, body)
    return msg


@router.post("/{conversation_id}/attachments", response_model=MessageOut, status_code=201)
async def send_attachment(
    conversation_id: str,
    file: UploadFile = File(...),
    caption: str = Form(""),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    UPLOAD_DIR = Path("uploads")
    UPLOAD_DIR.mkdir(exist_ok=True)

    safe_name = Path(file.filename or "attachment").name.replace(" ", "_")
    filename = f"{uuid.uuid4().hex}_{safe_name}"
    file_path = UPLOAD_DIR / filename
    content = await file.read()
    file_path.write_bytes(content)

    media_url = f"/uploads/{filename}"
    content_type = (file.content_type or "").lower()
    if content_type.startswith("image/"):
        message_type = MessageType.IMAGE
    elif content_type in {"application/pdf"}:
        message_type = MessageType.DOCUMENT
    else:
        message_type = MessageType.DOCUMENT

    msg = await svc.send_media_attachment(
        db,
        conversation_id,
        current_user,
        message_type=message_type,
        media_url=media_url,
        caption=caption.strip() or None,
    )
    return msg
