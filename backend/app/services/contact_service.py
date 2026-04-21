from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.contact import Contact
from app.models.conversation import Conversation
from app.models.user import User
from app.services.audit_service import record_audit_log


async def get_contact_crm(db: AsyncSession, contact_id: str) -> dict:
    result = await db.execute(
        select(Contact)
        .where(Contact.id == contact_id)
        .options(selectinload(Contact.responsible_user))
    )
    contact = result.scalar_one_or_none()
    if not contact:
        raise HTTPException(status_code=404, detail="Contato nao encontrado")

    conversations_result = await db.execute(
        select(Conversation)
        .where(Conversation.contact_id == contact.id)
        .options(selectinload(Conversation.agent), selectinload(Conversation.sector))
        .order_by(Conversation.started_at.desc())
    )
    conversations = conversations_result.scalars().all()

    summary = {
        "total_conversations": len(conversations),
        "open_conversations": sum(1 for conv in conversations if conv.status.value in {"waiting", "in_progress"}),
        "finished_conversations": sum(1 for conv in conversations if conv.status.value == "finished"),
        "last_touched_at": max(
            (
                conv.last_message_at.isoformat()
                for conv in conversations
                if conv.last_message_at is not None
            ),
            default=None,
        ),
    }

    history = []
    for conv in conversations[:10]:
        history.append(
            {
                "id": conv.id,
                "status": conv.status.value,
                "agent_name": conv.agent.name if conv.agent else None,
                "sector_name": conv.sector.name if conv.sector else None,
                "priority": conv.priority,
                "unread_count": conv.unread_count,
                "started_at": conv.started_at.isoformat() if conv.started_at else None,
                "last_message_at": conv.last_message_at.isoformat() if conv.last_message_at else None,
                "finished_at": conv.finished_at.isoformat() if conv.finished_at else None,
            }
        )

    return {
        "contact": {
            "id": contact.id,
            "phone": contact.phone,
            "name": contact.name,
            "profile_picture": contact.profile_picture,
            "company": contact.company,
            "origin": contact.origin,
            "stage": contact.stage,
            "notes": contact.notes,
            "responsible_user_id": contact.responsible_user_id,
            "responsible_user": {
                "id": contact.responsible_user.id,
                "name": contact.responsible_user.name,
                "email": contact.responsible_user.email,
                "role": contact.responsible_user.role.value,
                "is_active": contact.responsible_user.is_active,
                "is_online": contact.responsible_user.is_online,
                "sector_id": contact.responsible_user.sector_id,
            }
            if contact.responsible_user
            else None,
            "created_at": contact.created_at.isoformat() if contact.created_at else None,
            "updated_at": contact.updated_at.isoformat() if contact.updated_at else None,
        },
        "summary": summary,
        "history": history,
    }


async def update_contact_crm(
    db: AsyncSession,
    contact_id: str,
    data: dict,
    *,
    actor: User | None = None,
) -> dict:
    result = await db.execute(select(Contact).where(Contact.id == contact_id))
    contact = result.scalar_one_or_none()
    if not contact:
        raise HTTPException(status_code=404, detail="Contato nao encontrado")

    allowed_fields = {"name", "company", "origin", "stage", "notes", "responsible_user_id"}
    changes: dict[str, object] = {}
    for field, value in data.items():
        if field in allowed_fields:
            if field == "responsible_user_id" and value:
                user_result = await db.execute(select(User).where(User.id == value))
                if user_result.scalar_one_or_none() is None:
                    raise HTTPException(status_code=404, detail="Responsavel nao encontrado")
            setattr(contact, field, value)
            changes[field] = value

    await db.flush()
    await record_audit_log(
        db,
        action="contact.updated",
        entity_type="contact",
        entity_id=contact.id,
        actor=actor,
        details=changes,
    )
    return await get_contact_crm(db, contact.id)
