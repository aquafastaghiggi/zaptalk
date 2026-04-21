from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.deps import get_current_user, require_manager_or_admin
from app.db.database import get_db
from app.models.user import User
from app.schemas.conversation import QuickReplyCreate, QuickReplyOut, QuickReplyUpdate
from app.services.audit_service import record_audit_log
from app.services.quick_reply_service import (
    create_quick_reply,
    delete_quick_reply,
    list_quick_replies,
    update_quick_reply,
)

router = APIRouter(prefix="/quick-replies", tags=["quick-replies"])


@router.get("", response_model=list[QuickReplyOut])
async def list_replies(
    search: str | None = None,
    sector_id: str | None = None,
    include_inactive: bool = False,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await list_quick_replies(db, search=search, sector_id=sector_id, include_inactive=include_inactive)


@router.post("", response_model=QuickReplyOut, status_code=201)
async def create_reply(
    body: QuickReplyCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_manager_or_admin),
):
    reply = await create_quick_reply(db, body)
    reply.created_by_id = current_user.id
    await db.flush()
    result = await db.execute(
        select(type(reply))
        .where(type(reply).id == reply.id)
        .options(selectinload(type(reply).created_by), selectinload(type(reply).sector))
    )
    reply = result.scalar_one()
    await record_audit_log(
        db,
        action="quick_reply.created",
        entity_type="quick_reply",
        entity_id=reply.id,
        actor=current_user,
        details={
            "shortcut": reply.shortcut,
            "title": reply.title,
            "sector_id": reply.sector_id,
        },
    )
    return reply


@router.patch("/{reply_id}", response_model=QuickReplyOut)
async def update_reply(
    reply_id: str,
    body: QuickReplyUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_manager_or_admin),
):
    reply = await update_quick_reply(db, reply_id, body)
    result = await db.execute(
        select(type(reply))
        .where(type(reply).id == reply.id)
        .options(selectinload(type(reply).created_by), selectinload(type(reply).sector))
    )
    reply = result.scalar_one()
    await record_audit_log(
        db,
        action="quick_reply.updated",
        entity_type="quick_reply",
        entity_id=reply.id,
        actor=current_user,
    )
    return reply


@router.delete("/{reply_id}")
async def delete_reply(
    reply_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_manager_or_admin),
):
    await delete_quick_reply(db, reply_id)
    await record_audit_log(
        db,
        action="quick_reply.deleted",
        entity_type="quick_reply",
        entity_id=reply_id,
        actor=current_user,
    )
    return {"ok": True}
