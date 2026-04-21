from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditLog
from app.models.user import User


async def record_audit_log(
    db: AsyncSession,
    *,
    action: str,
    entity_type: str,
    entity_id: str | None = None,
    actor: User | None = None,
    details: dict[str, Any] | None = None,
) -> AuditLog:
    log = AuditLog(
        actor_id=actor.id if actor else None,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        details=details,
    )
    db.add(log)
    await db.flush()
    return log
