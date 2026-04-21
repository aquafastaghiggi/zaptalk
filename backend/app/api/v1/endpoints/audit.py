from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.deps import require_manager_or_admin
from app.db.database import get_db
from app.models.audit_log import AuditLog
from app.models.user import User

router = APIRouter(prefix="/audit", tags=["audit"])


def _serialize_audit_log(item: AuditLog) -> dict:
    return {
        "id": item.id,
        "actor": {
            "id": item.actor.id,
            "name": item.actor.name,
            "email": item.actor.email,
            "role": item.actor.role.value,
        }
        if item.actor
        else None,
        "action": item.action,
        "entity_type": item.entity_type,
        "entity_id": item.entity_id,
        "details": item.details,
        "created_at": item.created_at.isoformat(),
    }


@router.get("")
async def list_audit_logs(
    limit: int = Query(50, ge=1, le=200),
    action: str | None = Query(None),
    entity_type: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_manager_or_admin),
):
    query = select(AuditLog).options(selectinload(AuditLog.actor)).order_by(AuditLog.created_at.desc())
    if action:
        query = query.where(AuditLog.action == action)
    if entity_type:
        query = query.where(AuditLog.entity_type == entity_type)
    query = query.limit(limit)

    result = await db.execute(query)
    logs = result.scalars().all()
    return [_serialize_audit_log(item) for item in logs]
