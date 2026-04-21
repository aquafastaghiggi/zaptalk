from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from fastapi import HTTPException

from app.models.quick_reply import QuickReply
from app.models.sector import Sector


async def list_quick_replies(
    db: AsyncSession,
    *,
    search: str | None = None,
    sector_id: str | None = None,
    include_inactive: bool = False,
) -> list[QuickReply]:
    query = select(QuickReply).options(selectinload(QuickReply.created_by), selectinload(QuickReply.sector))
    if not include_inactive:
        query = query.where(QuickReply.is_active == True)  # noqa: E712
    if sector_id:
        query = query.where((QuickReply.sector_id == sector_id) | (QuickReply.sector_id.is_(None)))
    if search:
        term = f"%{search.strip().lower()}%"
        query = query.where(
            func.lower(QuickReply.title).like(term)
            | func.lower(QuickReply.shortcut).like(term)
            | func.lower(QuickReply.content).like(term)
        )
    result = await db.execute(query.order_by(QuickReply.shortcut.asc(), QuickReply.created_at.desc()))
    return result.scalars().all()


async def create_quick_reply(db: AsyncSession, payload) -> QuickReply:
    reply = QuickReply(
        title=payload.title.strip(),
        shortcut=payload.shortcut.strip().lower(),
        content=payload.content.strip(),
        sector_id=payload.sector_id,
        is_active=payload.is_active,
        created_by_id=payload.created_by_id if hasattr(payload, "created_by_id") else None,
    )
    db.add(reply)
    await db.flush()
    return reply


async def update_quick_reply(db: AsyncSession, reply_id: str, payload) -> QuickReply:
    result = await db.execute(select(QuickReply).where(QuickReply.id == reply_id))
    reply = result.scalar_one_or_none()
    if not reply:
        raise HTTPException(status_code=404, detail="Resposta rapida nao encontrada")

    for field in ("title", "shortcut", "content", "sector_id", "is_active"):
        value = getattr(payload, field, None)
        if value is not None:
            setattr(reply, field, value.strip().lower() if field == "shortcut" else value.strip() if isinstance(value, str) else value)

    await db.flush()
    return reply


async def delete_quick_reply(db: AsyncSession, reply_id: str) -> None:
    result = await db.execute(select(QuickReply).where(QuickReply.id == reply_id))
    reply = result.scalar_one_or_none()
    if not reply:
        raise HTTPException(status_code=404, detail="Resposta rapida nao encontrada")
    await db.delete(reply)


async def list_quick_reply_filters(db: AsyncSession) -> dict:
    sectors_result = await db.execute(select(Sector).where(Sector.is_active == True).order_by(Sector.name))  # noqa: E712
    sectors = sectors_result.scalars().all()
    replies = await list_quick_replies(db, include_inactive=False)
    return {
        "sectors": [{"id": sector.id, "name": sector.name} for sector in sectors],
        "shortcuts": [{"id": reply.id, "title": reply.title, "shortcut": reply.shortcut, "content": reply.content, "sector_id": reply.sector_id} for reply in replies],
    }
