from datetime import date, datetime, timezone
from pathlib import Path
from typing import List, Optional

from fastapi import HTTPException
from sqlalchemy import func, select, or_, exists
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.models.contact import Contact
from app.models.conversation import Conversation, ConversationStatus
from app.models.conversation_note import ConversationNote
from app.models.conversation_tag import ConversationTag
from app.models.conversation_transfer import ConversationTransferLog
from app.models.message import Message, MessageDirection, MessageType
from app.models.quick_reply import QuickReply
from app.models.user import User, UserRole
from app.schemas.conversation import SendMessageRequest
from app.services.audit_service import record_audit_log
from app.services.evolution_service import EvolutionService
from app.websocket.manager import ws_manager

UPLOAD_DIR = Path("uploads")


async def _load_conversation(db: AsyncSession, conversation_id: str) -> Conversation:
    result = await db.execute(
        select(Conversation)
        .where(Conversation.id == conversation_id)
        .options(
            selectinload(Conversation.contact),
            selectinload(Conversation.agent),
            selectinload(Conversation.sector),
            selectinload(Conversation.messages),
        )
    )
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversa nao encontrada")
    return conv


def _serialize_user(user: User | None) -> dict | None:
    if not user:
        return None
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role.value,
        "is_active": user.is_active,
        "is_online": user.is_online,
        "sector_id": user.sector_id,
    }


def _serialize_note(note: ConversationNote) -> dict:
    return {
        "id": note.id,
        "content": note.content,
        "is_internal": note.is_internal,
        "created_at": note.created_at.isoformat(),
        "created_by": _serialize_user(note.created_by),
    }


def _serialize_tag(tag: ConversationTag) -> dict:
    return {
        "id": tag.id,
        "label": tag.label,
        "created_at": tag.created_at.isoformat(),
        "created_by": _serialize_user(tag.created_by),
    }


def _serialize_transfer(transfer: ConversationTransferLog) -> dict:
    return {
        "id": transfer.id,
        "from_agent_id": transfer.from_agent_id,
        "to_agent_id": transfer.to_agent_id,
        "from_sector_id": transfer.from_sector_id,
        "to_sector_id": transfer.to_sector_id,
        "reason": transfer.reason,
        "created_at": transfer.created_at.isoformat(),
        "created_by": _serialize_user(transfer.created_by),
    }


def conversation_payload(conv: Conversation) -> dict:
    return {
        "id": conv.id,
        "status": conv.status.value,
        "agent_id": conv.agent_id,
        "sector_id": conv.sector_id,
        "priority": conv.priority,
        "is_pinned": conv.is_pinned,
        "unread_count": conv.unread_count,
        "last_message_at": conv.last_message_at.isoformat() if conv.last_message_at else None,
        "started_at": conv.started_at.isoformat() if conv.started_at else None,
        "finished_at": conv.finished_at.isoformat() if conv.finished_at else None,
        "contact": {
            "id": conv.contact.id,
            "phone": conv.contact.phone,
            "name": conv.contact.name,
            "profile_picture": conv.contact.profile_picture,
        }
        if conv.contact
        else None,
        "agent": {
            "id": conv.agent.id,
            "name": conv.agent.name,
            "email": conv.agent.email,
            "role": conv.agent.role.value,
            "is_active": conv.agent.is_active,
            "is_online": conv.agent.is_online,
            "sector_id": conv.agent.sector_id,
        }
        if conv.agent
        else None,
    }


def _order_for_status(status: Optional[ConversationStatus]):
    pinned_first = Conversation.is_pinned.desc()
    if status == ConversationStatus.WAITING:
        return (
            pinned_first,
            Conversation.priority.desc(),
            Conversation.last_message_at.asc().nullsfirst(),
            Conversation.started_at.asc(),
        )
    if status == ConversationStatus.FINISHED:
        return (pinned_first, Conversation.finished_at.desc().nullslast(),)
    return (pinned_first, Conversation.last_message_at.desc().nullslast(),)


async def _count_active_conversations(db: AsyncSession, agent_id: str) -> int:
    result = await db.execute(
        select(func.count(Conversation.id)).where(
            Conversation.agent_id == agent_id,
            Conversation.status == ConversationStatus.IN_PROGRESS,
        )
    )
    return int(result.scalar_one() or 0)


async def _pick_available_agent(db: AsyncSession, sector_id: Optional[str]) -> User | None:
    query = select(User).where(
        User.is_active == True,  # noqa: E712
        User.role == UserRole.AGENT,
    )
    if sector_id:
        query = query.where(User.sector_id == sector_id)

    query = query.order_by(User.is_online.desc(), User.created_at.asc())
    result = await db.execute(query)
    agents = result.scalars().all()

    for agent in agents:
        active_count = await _count_active_conversations(db, agent.id)
        if active_count < settings.MAX_ACTIVE_CONVERSATIONS_PER_AGENT:
            return agent

    return None


async def _register_transfer_log(
    db: AsyncSession,
    *,
    conversation_id: str,
    created_by: User | None,
    from_agent_id: str | None,
    to_agent_id: str | None,
    from_sector_id: str | None,
    to_sector_id: str | None,
    reason: str | None,
) -> ConversationTransferLog:
    log = ConversationTransferLog(
        conversation_id=conversation_id,
        created_by_id=created_by.id if created_by else None,
        from_agent_id=from_agent_id,
        to_agent_id=to_agent_id,
        from_sector_id=from_sector_id,
        to_sector_id=to_sector_id,
        reason=reason,
    )
    db.add(log)
    await db.flush()
    return log


async def get_conversation_meta(db: AsyncSession, conversation_id: str) -> dict:
    result = await db.execute(
        select(Conversation)
        .where(Conversation.id == conversation_id)
        .options(
            selectinload(Conversation.notes).selectinload(ConversationNote.created_by),
            selectinload(Conversation.tags).selectinload(ConversationTag.created_by),
            selectinload(Conversation.transfer_logs).selectinload(ConversationTransferLog.created_by),
        )
    )
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversa nao encontrada")

    return {
        "notes": [_serialize_note(note) for note in conv.notes],
        "tags": [_serialize_tag(tag) for tag in conv.tags],
        "transfers": [_serialize_transfer(transfer) for transfer in conv.transfer_logs],
    }


async def list_conversations(
    db: AsyncSession,
    status: Optional[ConversationStatus] = None,
    agent_id: Optional[str] = None,
    sector_id: Optional[str] = None,
    search: Optional[str] = None,
    tag: Optional[str] = None,
    date_from: date | None = None,
    date_to: date | None = None,
    pinned: bool | None = None,
    unread: bool | None = None,
) -> List[Conversation]:
    query = select(Conversation).options(
        selectinload(Conversation.contact),
        selectinload(Conversation.agent),
        selectinload(Conversation.sector),
    )
    if search:
        term = f"%{search.strip().lower()}%"
        query = query.join(Contact)
        query = query.where(
            or_(
                func.lower(Contact.name).like(term),
                func.lower(Contact.phone).like(term),
                func.lower(Conversation.id).like(term),
            )
        )
    if status:
        query = query.where(Conversation.status == status)
    if agent_id:
        query = query.where(Conversation.agent_id == agent_id)
    if sector_id:
        query = query.where(Conversation.sector_id == sector_id)
    if tag:
        normalized_tag = tag.strip().lower()
        query = query.where(
            exists(
                select(1).where(
                    ConversationTag.conversation_id == Conversation.id,
                    func.lower(ConversationTag.label) == normalized_tag,
                )
            )
        )
    if date_from:
        query = query.where(func.date(Conversation.started_at) >= date_from.isoformat())
    if date_to:
        query = query.where(func.date(Conversation.started_at) <= date_to.isoformat())
    if pinned is not None:
        query = query.where(Conversation.is_pinned == pinned)
    if unread is not None:
        query = query.where(Conversation.unread_count > 0 if unread else Conversation.unread_count == 0)

    query = query.distinct().order_by(*_order_for_status(status))
    result = await db.execute(query)
    return result.scalars().all()


async def assign_agent(
    db: AsyncSession,
    conversation_id: str,
    agent_id: str,
    *,
    created_by: User | None = None,
    reason: str | None = None,
) -> Conversation:
    conv = await _load_conversation(db, conversation_id)
    previous_agent_id = conv.agent_id

    result = await db.execute(select(User).where(User.id == agent_id))
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="Atendente nao encontrado")

    conv.agent_id = agent_id
    conv.status = ConversationStatus.IN_PROGRESS
    transfer = await _register_transfer_log(
        db,
        conversation_id=conv.id,
        created_by=created_by,
        from_agent_id=previous_agent_id,
        to_agent_id=agent_id,
        from_sector_id=conv.sector_id,
        to_sector_id=conv.sector_id,
        reason=reason,
    )

    await ws_manager.send_to(
        agent_id,
        "conversation_assigned",
        {
            "conversation_id": conversation_id,
            "contact_name": conv.contact.name or conv.contact.phone,
            "status": conv.status.value,
            "agent_id": conv.agent_id,
            "sector_id": conv.sector_id,
            "priority": conv.priority,
            "transfer_id": transfer.id,
            "reason": reason,
        },
    )

    await record_audit_log(
        db,
        action="conversation.assigned",
        entity_type="conversation",
        entity_id=conv.id,
        actor=created_by,
        details={
            "from_agent_id": previous_agent_id,
            "to_agent_id": agent_id,
            "sector_id": conv.sector_id,
            "reason": reason,
        },
    )

    return conv


async def transfer_conversation(
    db: AsyncSession,
    conversation_id: str,
    new_agent_id: Optional[str],
    new_sector_id: Optional[str],
    *,
    reason: str | None = None,
    created_by: User | None = None,
) -> Conversation:
    conv = await _load_conversation(db, conversation_id)
    previous_agent_id = conv.agent_id
    previous_sector_id = conv.sector_id

    if new_agent_id:
        result = await db.execute(select(User).where(User.id == new_agent_id))
        if not result.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="Atendente nao encontrado")
        conv.agent_id = new_agent_id
        conv.status = ConversationStatus.IN_PROGRESS

    if new_sector_id:
        conv.sector_id = new_sector_id
        if not new_agent_id:
            conv.agent_id = None
            conv.status = ConversationStatus.WAITING

    transfer = await _register_transfer_log(
        db,
        conversation_id=conv.id,
        created_by=created_by,
        from_agent_id=previous_agent_id,
        to_agent_id=conv.agent_id,
        from_sector_id=previous_sector_id,
        to_sector_id=conv.sector_id,
        reason=reason,
    )

    await ws_manager.broadcast(
        "conversation_transferred",
        {
            "conversation_id": conversation_id,
            "new_agent_id": new_agent_id,
            "new_sector_id": new_sector_id,
            "status": conv.status.value,
            "agent_id": conv.agent_id,
            "sector_id": conv.sector_id,
            "priority": conv.priority,
            "transfer_id": transfer.id,
            "reason": reason,
        },
    )

    if conv.agent_id:
        await ws_manager.send_to(
            conv.agent_id,
            "conversation_assigned",
            {
                "conversation_id": conversation_id,
                "status": conv.status.value,
                "agent_id": conv.agent_id,
                "sector_id": conv.sector_id,
                "priority": conv.priority,
                "transfer_id": transfer.id,
                "reason": reason,
            },
        )

    await record_audit_log(
        db,
        action="conversation.transferred",
        entity_type="conversation",
        entity_id=conv.id,
        actor=created_by,
        details={
            "from_agent_id": previous_agent_id,
            "to_agent_id": conv.agent_id,
            "from_sector_id": previous_sector_id,
            "to_sector_id": conv.sector_id,
            "reason": reason,
        },
    )

    return conv


async def finish_conversation(
    db: AsyncSession,
    conversation_id: str,
    *,
    created_by: User | None = None,
) -> Conversation:
    conv = await _load_conversation(db, conversation_id)
    conv.status = ConversationStatus.FINISHED
    conv.finished_at = datetime.now(timezone.utc)
    await db.flush()

    await ws_manager.broadcast(
        "conversation_finished",
        {
            "conversation_id": conversation_id,
            "status": conv.status.value,
            "finished_at": conv.finished_at.isoformat() if conv.finished_at else None,
        },
    )
    await record_audit_log(
        db,
        action="conversation.finished",
        entity_type="conversation",
        entity_id=conv.id,
        actor=created_by,
        details={
            "status": conv.status.value,
            "finished_at": conv.finished_at.isoformat() if conv.finished_at else None,
        },
    )
    return conv


async def requeue_conversation(
    db: AsyncSession,
    conversation_id: str,
    *,
    created_by: User | None = None,
) -> Conversation:
    conv = await _load_conversation(db, conversation_id)
    previous_agent_id = conv.agent_id
    previous_sector_id = conv.sector_id

    conv.agent_id = None
    conv.status = ConversationStatus.WAITING
    transfer = await _register_transfer_log(
        db,
        conversation_id=conv.id,
        created_by=created_by,
        from_agent_id=previous_agent_id,
        to_agent_id=None,
        from_sector_id=previous_sector_id,
        to_sector_id=previous_sector_id,
        reason="Retornada para fila",
    )

    await ws_manager.broadcast(
        "conversation_requeued",
        {
            "conversation_id": conversation_id,
            "status": conv.status.value,
            "agent_id": conv.agent_id,
            "sector_id": conv.sector_id,
            "priority": conv.priority,
            "transfer_id": transfer.id,
            "reason": "Retornada para fila",
        },
    )

    await record_audit_log(
        db,
        action="conversation.requeued",
        entity_type="conversation",
        entity_id=conv.id,
        actor=created_by,
        details={
            "from_agent_id": previous_agent_id,
            "from_sector_id": previous_sector_id,
            "transfer_id": transfer.id,
        },
    )

    return conv


async def set_conversation_priority(
    db: AsyncSession,
    conversation_id: str,
    priority: int,
    *,
    created_by: User | None = None,
) -> Conversation:
    conv = await _load_conversation(db, conversation_id)
    conv.priority = max(0, min(int(priority), 3))
    await db.flush()

    await ws_manager.broadcast(
        "conversation_priority_changed",
        {
            "conversation_id": conversation_id,
            "priority": conv.priority,
        },
    )

    await record_audit_log(
        db,
        action="conversation.priority_changed",
        entity_type="conversation",
        entity_id=conv.id,
        actor=created_by,
        details={
            "priority": conv.priority,
        },
    )

    return conv


async def toggle_conversation_pin(
    db: AsyncSession,
    conversation_id: str,
    *,
    created_by: User | None = None,
) -> Conversation:
    conv = await _load_conversation(db, conversation_id)
    conv.is_pinned = not conv.is_pinned
    await db.flush()

    await ws_manager.broadcast(
        "conversation_pinned",
        {
            "conversation_id": conversation_id,
            "is_pinned": conv.is_pinned,
        },
    )

    await record_audit_log(
        db,
        action="conversation.pinned" if conv.is_pinned else "conversation.unpinned",
        entity_type="conversation",
        entity_id=conv.id,
        actor=created_by,
        details={"is_pinned": conv.is_pinned},
    )
    return conv


async def mark_conversation_unread(
    db: AsyncSession,
    conversation_id: str,
    *,
    created_by: User | None = None,
) -> Conversation:
    conv = await _load_conversation(db, conversation_id)
    conv.unread_count = max(conv.unread_count, 1)
    await db.flush()

    await ws_manager.broadcast(
        "conversation_marked_unread",
        {
            "conversation_id": conversation_id,
            "unread_count": conv.unread_count,
        },
    )

    await record_audit_log(
        db,
        action="conversation.marked_unread",
        entity_type="conversation",
        entity_id=conv.id,
        actor=created_by,
        details={"unread_count": conv.unread_count},
    )
    return conv


async def reopen_conversation(
    db: AsyncSession,
    conversation_id: str,
    *,
    created_by: User | None = None,
) -> Conversation:
    conv = await _load_conversation(db, conversation_id)
    conv.status = ConversationStatus.WAITING
    conv.agent_id = None
    conv.finished_at = None
    conv.first_response_at = None
    conv.unread_count = 0
    await db.flush()

    await ws_manager.broadcast(
        "conversation_reopened",
        {
            "conversation_id": conversation_id,
            "status": conv.status.value,
            "agent_id": conv.agent_id,
            "finished_at": None,
            "is_pinned": conv.is_pinned,
        },
    )

    await record_audit_log(
        db,
        action="conversation.reopened",
        entity_type="conversation",
        entity_id=conv.id,
        actor=created_by,
    )
    return conv


async def auto_assign_conversation(db: AsyncSession, conversation_id: str) -> Conversation | None:
    conv = await _load_conversation(db, conversation_id)
    if not settings.AUTO_ASSIGN_CONVERSATIONS:
        return None

    if conv.status != ConversationStatus.WAITING:
        return None

    agent = await _pick_available_agent(db, conv.sector_id)
    if not agent:
        return None

    return await assign_agent(db, conversation_id, agent.id, reason="Distribuicao automatica")


async def add_conversation_note(
    db: AsyncSession,
    conversation_id: str,
    content: str,
    created_by: User,
) -> ConversationNote:
    conv = await _load_conversation(db, conversation_id)
    note = ConversationNote(
        conversation_id=conv.id,
        created_by_id=created_by.id,
        content=content.strip(),
    )
    db.add(note)
    await db.flush()

    await ws_manager.broadcast(
        "conversation_note_added",
        {
            "conversation_id": conversation_id,
            "note": _serialize_note(note),
        },
    )
    await record_audit_log(
        db,
        action="conversation.note_added",
        entity_type="conversation",
        entity_id=conv.id,
        actor=created_by,
        details={
            "note_id": note.id,
            "content": note.content,
        },
    )
    return note


async def remove_conversation_note(
    db: AsyncSession,
    conversation_id: str,
    note_id: str,
    *,
    created_by: User | None = None,
) -> None:
    result = await db.execute(
        select(ConversationNote).where(
            ConversationNote.id == note_id,
            ConversationNote.conversation_id == conversation_id,
        )
    )
    note = result.scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=404, detail="Nota nao encontrada")
    await db.delete(note)
    await record_audit_log(
        db,
        action="conversation.note_removed",
        entity_type="conversation",
        entity_id=conversation_id,
        actor=created_by,
        details={
            "note_id": note_id,
        },
    )


async def add_conversation_tag(
    db: AsyncSession,
    conversation_id: str,
    label: str,
    created_by: User,
) -> ConversationTag:
    conv = await _load_conversation(db, conversation_id)
    normalized = " ".join(label.split()).strip().lower()
    if not normalized:
        raise HTTPException(status_code=400, detail="Tag invalida")

    result = await db.execute(
        select(ConversationTag).where(
            ConversationTag.conversation_id == conv.id,
            ConversationTag.label == normalized,
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        return existing

    tag = ConversationTag(
        conversation_id=conv.id,
        created_by_id=created_by.id,
        label=normalized,
    )
    db.add(tag)
    await db.flush()

    await ws_manager.broadcast(
        "conversation_tag_added",
        {
            "conversation_id": conversation_id,
            "tag": _serialize_tag(tag),
        },
    )
    await record_audit_log(
        db,
        action="conversation.tag_added",
        entity_type="conversation",
        entity_id=conv.id,
        actor=created_by,
        details={
            "tag_id": tag.id,
            "label": tag.label,
        },
    )
    return tag


async def remove_conversation_tag(
    db: AsyncSession,
    conversation_id: str,
    tag_id: str,
    *,
    created_by: User | None = None,
) -> None:
    result = await db.execute(
        select(ConversationTag).where(
            ConversationTag.id == tag_id,
            ConversationTag.conversation_id == conversation_id,
        )
    )
    tag = result.scalar_one_or_none()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag nao encontrada")
    await db.delete(tag)
    await record_audit_log(
        db,
        action="conversation.tag_removed",
        entity_type="conversation",
        entity_id=conversation_id,
        actor=created_by,
        details={
            "tag_id": tag_id,
        },
    )


async def list_transfer_history(db: AsyncSession, conversation_id: str) -> list[dict]:
    result = await db.execute(
        select(ConversationTransferLog)
        .where(ConversationTransferLog.conversation_id == conversation_id)
        .options(selectinload(ConversationTransferLog.created_by))
        .order_by(ConversationTransferLog.created_at.desc())
    )
    return [_serialize_transfer(item) for item in result.scalars().all()]


async def send_message(
    db: AsyncSession,
    conversation_id: str,
    sender: User,
    data: SendMessageRequest,
) -> Message:
    conv = await _load_conversation(db, conversation_id)

    if conv.status == ConversationStatus.FINISHED:
        raise HTTPException(status_code=400, detail="Conversa ja finalizada")

    evolution = EvolutionService()
    await evolution.send_text(
        instance=conv.whatsapp_instance,
        phone=conv.contact.phone,
        text=data.content,
    )

    msg = Message(
        conversation_id=conversation_id,
        sender_id=sender.id,
        direction=MessageDirection.OUTBOUND,
        message_type=data.message_type,
        content=data.content,
    )
    db.add(msg)

    now = datetime.now(timezone.utc)
    conv.last_message_at = now
    conv.unread_count = 0
    if conv.first_response_at is None:
        conv.first_response_at = now
    await db.flush()

    if conv.first_response_at == now:
        await record_audit_log(
            db,
            action="conversation.first_response_recorded",
            entity_type="conversation",
            entity_id=conv.id,
            actor=sender,
            details={
                "first_response_at": now.isoformat(),
            },
        )

    await ws_manager.broadcast(
        "new_message",
        {
            "conversation_id": conversation_id,
            "message": {
                "id": msg.id,
                "content": msg.content,
                "direction": msg.direction.value,
                "sender_id": msg.sender_id,
                "created_at": msg.created_at.isoformat(),
            },
        },
    )

    return msg


async def send_media_attachment(
    db: AsyncSession,
    conversation_id: str,
    sender: User,
    *,
    message_type: MessageType,
    media_url: str,
    caption: str | None = None,
) -> Message:
    conv = await _load_conversation(db, conversation_id)

    if conv.status == ConversationStatus.FINISHED:
        raise HTTPException(status_code=400, detail="Conversa ja finalizada")

    evolution = EvolutionService()
    media_type = message_type.value if message_type != MessageType.DOCUMENT else "document"
    await evolution.send_media(
        instance=conv.whatsapp_instance,
        phone=conv.contact.phone,
        media_url=f"{settings.BACKEND_PUBLIC_URL.rstrip('/')}{media_url}",
        media_type=media_type,
        caption=caption or "",
    )

    msg = Message(
        conversation_id=conversation_id,
        sender_id=sender.id,
        direction=MessageDirection.OUTBOUND,
        message_type=message_type,
        content=caption or None,
        media_url=media_url,
    )
    db.add(msg)

    now = datetime.now(timezone.utc)
    conv.last_message_at = now
    conv.unread_count = 0
    if conv.first_response_at is None:
        conv.first_response_at = now
    await db.flush()

    await ws_manager.broadcast(
        "new_message",
        {
            "conversation_id": conversation_id,
            "message": {
                "id": msg.id,
                "content": msg.content,
                "media_url": msg.media_url,
                "direction": msg.direction.value,
                "message_type": msg.message_type.value,
                "sender_id": msg.sender_id,
                "created_at": msg.created_at.isoformat(),
            },
            "unread_count": conv.unread_count,
        },
    )

    return msg
