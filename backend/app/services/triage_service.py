from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.conversation import Conversation, ConversationStatus
from app.models.sector import Sector
from app.services.audit_service import record_audit_log
from app.services.conversation_service import auto_assign_conversation, conversation_payload
from app.websocket.manager import ws_manager


def _normalize_text(text: str | None) -> str:
    return " ".join((text or "").lower().split())


def _sector_keywords(sector: Sector) -> list[str]:
    raw = (sector.routing_keywords or "").replace("\n", ",").replace(";", ",")
    return [keyword.strip().lower() for keyword in raw.split(",") if keyword.strip()]


async def suggest_sector_for_text(db: AsyncSession, text: str | None) -> Sector | None:
    normalized = _normalize_text(text)
    if not normalized:
        return None

    result = await db.execute(
        select(Sector)
        .where(Sector.is_active == True)  # noqa: E712
        .order_by(Sector.name.asc())
    )
    sectors = result.scalars().all()

    for sector in sectors:
        for keyword in _sector_keywords(sector):
            if keyword and keyword in normalized:
                return sector
    return None


async def apply_triage_for_conversation(
    db: AsyncSession,
    conversation_id: str,
    *,
    text_candidates: list[str | None] | None = None,
    created_by=None,
) -> dict:
    result = await db.execute(
        select(Conversation)
        .where(Conversation.id == conversation_id)
        .options(
            selectinload(Conversation.contact),
            selectinload(Conversation.agent),
            selectinload(Conversation.sector),
        )
    )
    conv = result.scalar_one_or_none()
    if not conv:
        return {"matched": False, "reason": "conversation_not_found"}

    candidates = text_candidates or []
    if conv.contact:
        candidates.extend([conv.contact.name, conv.contact.phone, conv.contact.company, conv.contact.origin, conv.contact.stage])

    matched_sector = None
    for candidate in candidates:
        matched_sector = await suggest_sector_for_text(db, candidate)
        if matched_sector:
            break

    if not matched_sector:
        return {"matched": False, "sector_id": None}

    previous_sector_id = conv.sector_id
    conv.sector_id = matched_sector.id

    reassigned = False
    if conv.status == ConversationStatus.WAITING or conv.agent_id is None:
        auto_assigned = await auto_assign_conversation(db, conv.id)
        reassigned = auto_assigned is not None

    await record_audit_log(
        db,
        action="conversation.triaged",
        entity_type="conversation",
        entity_id=conv.id,
        actor=created_by,
        details={
            "from_sector_id": previous_sector_id,
            "to_sector_id": matched_sector.id,
            "matched_keyword_source": "triage_rules",
            "auto_assigned": reassigned,
        },
    )

    await ws_manager.broadcast(
        "conversation_triaged",
        {
            "conversation_id": conv.id,
            "sector_id": matched_sector.id,
            "sector_name": matched_sector.name,
            "auto_assigned": reassigned,
        },
    )

    return {
        "matched": True,
        "sector_id": matched_sector.id,
        "sector_name": matched_sector.name,
        "auto_assigned": reassigned,
        "conversation": conversation_payload(conv),
    }
