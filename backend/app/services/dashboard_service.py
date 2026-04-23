from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timezone, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.models.conversation import Conversation, ConversationStatus
from app.models.sector import Sector
from app.models.user import User, UserRole

SAO_PAULO = timezone(timedelta(hours=-3))


def _local_now() -> datetime:
    return datetime.now(tz=SAO_PAULO)


def _to_local(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc).astimezone(SAO_PAULO)
    return value.astimezone(SAO_PAULO)


def _minutes_between(start: datetime | None, end: datetime | None) -> float | None:
    if not start or not end:
        return None
    delta = _to_local(end) - _to_local(start)
    return round(delta.total_seconds() / 60, 1)


def _conversation_label(conv: Conversation) -> str:
    if conv.contact and conv.contact.name:
        return conv.contact.name
    if conv.contact:
        return conv.contact.phone
    return conv.id


async def get_operational_dashboard(db: AsyncSession) -> dict:
    result = await db.execute(
        select(Conversation)
        .options(
            selectinload(Conversation.contact),
            selectinload(Conversation.agent).selectinload(User.sector),
            selectinload(Conversation.sector),
        )
        .where(Conversation.status != ConversationStatus.FINISHED)
        .order_by(Conversation.last_message_at.desc().nullslast())
        .limit(1000)
    )
    conversations = result.scalars().all()

    users_result = await db.execute(select(User))
    users = users_result.scalars().all()
    online_agents = [user for user in users if user.role == UserRole.AGENT and user.is_online and user.is_active]

    agents_result = await db.execute(
        select(User)
        .options(selectinload(User.sector))
        .where(User.role == UserRole.AGENT, User.is_active == True)  # noqa: E712
    )
    active_agents = agents_result.scalars().all()

    sectors_result = await db.execute(select(Sector).where(Sector.is_active == True))  # noqa: E712
    active_sectors = sectors_result.scalars().all()

    now = _local_now()
    waiting = 0
    in_progress = 0
    finished_today = 0
    first_response_values: list[float] = []
    resolution_values: list[float] = []
    volume_by_day_map: dict[str, int] = defaultdict(int)
    overdue_items: list[dict] = []
    stale_items: list[dict] = []
    agent_counts: dict[str, dict] = defaultdict(lambda: {"count": 0, "name": "", "online": False, "sector": None, "id": None})
    sector_counts: dict[str, dict] = defaultdict(lambda: {"count": 0, "name": "", "id": None})

    for agent in active_agents:
        agent_counts[agent.id] = {
            "id": agent.id,
            "name": agent.name,
            "count": 0,
            "online": agent.is_online,
            "sector": agent.sector.name if agent.sector else None,
        }

    for sector in active_sectors:
        sector_counts[sector.id] = {
            "id": sector.id,
            "name": sector.name,
            "count": 0,
        }

    for conv in conversations:
        status = conv.status
        started_at = _to_local(conv.started_at)
        finished_at = _to_local(conv.finished_at)
        last_message_at = _to_local(conv.last_message_at)
        first_response_at = _to_local(conv.first_response_at)

        if started_at:
            day_key = started_at.date().isoformat()
            volume_by_day_map[day_key] += 1

        if status == ConversationStatus.WAITING:
            waiting += 1
        elif status == ConversationStatus.IN_PROGRESS:
            in_progress += 1
        elif status == ConversationStatus.FINISHED and finished_at and finished_at.date() == now.date():
            finished_today += 1

        if first_response_at and started_at:
            first_response_values.append(round((first_response_at - started_at).total_seconds() / 60, 1))

        if status == ConversationStatus.FINISHED and started_at and finished_at:
            resolution_values.append(round((finished_at - started_at).total_seconds() / 60, 1))

        if conv.agent_id and conv.agent:
            bucket = agent_counts[conv.agent_id]
            bucket["id"] = conv.agent.id
            bucket["name"] = conv.agent.name
            bucket["online"] = conv.agent.is_online
            bucket["sector"] = conv.agent.sector.name if conv.agent.sector else None
            if status == ConversationStatus.IN_PROGRESS:
                bucket["count"] += 1

        if conv.sector_id and conv.sector:
            bucket = sector_counts[conv.sector_id]
            bucket["id"] = conv.sector.id
            bucket["name"] = conv.sector.name
            if status in (ConversationStatus.WAITING, ConversationStatus.IN_PROGRESS):
                bucket["count"] += 1

        if status == ConversationStatus.WAITING:
            baseline = last_message_at or started_at
            minutes_open = _minutes_between(baseline, now)
            if minutes_open is not None and minutes_open >= settings.SLA_FIRST_RESPONSE_MINUTES:
                overdue_items.append(
                    {
                        "conversation_id": conv.id,
                        "contact_name": _conversation_label(conv),
                        "sector": conv.sector.name if conv.sector else None,
                        "agent_name": conv.agent.name if conv.agent else None,
                        "status": status.value,
                        "priority": conv.priority,
                        "minutes_open": minutes_open,
                        "threshold_minutes": settings.SLA_FIRST_RESPONSE_MINUTES,
                    }
                )

        if status == ConversationStatus.IN_PROGRESS:
            baseline = last_message_at or started_at
            minutes_idle = _minutes_between(baseline, now)
            if minutes_idle is not None and minutes_idle >= settings.SLA_STALE_CONVERSATION_MINUTES:
                stale_items.append(
                    {
                        "conversation_id": conv.id,
                        "contact_name": _conversation_label(conv),
                        "sector": conv.sector.name if conv.sector else None,
                        "agent_name": conv.agent.name if conv.agent else None,
                        "status": status.value,
                        "priority": conv.priority,
                        "minutes_idle": minutes_idle,
                        "threshold_minutes": settings.SLA_STALE_CONVERSATION_MINUTES,
                    }
                )

    alerts = []
    if overdue_items:
        alerts.append(
            {
                "key": "first_response_overdue",
                "label": "Respostas atrasadas",
                "count": len(overdue_items),
                "items": sorted(overdue_items, key=lambda item: item["minutes_open"], reverse=True)[:10],
            }
        )
    if stale_items:
        alerts.append(
            {
                "key": "stale_conversations",
                "label": "Conversas paradas",
                "count": len(stale_items),
                "items": sorted(stale_items, key=lambda item: item["minutes_idle"], reverse=True)[:10],
            }
        )

    by_agent = sorted(agent_counts.values(), key=lambda item: (item["count"], item["name"]), reverse=True)
    by_sector = sorted(sector_counts.values(), key=lambda item: (item["count"], item["name"]), reverse=True)
    status_breakdown = [
        {"status": ConversationStatus.WAITING.value, "label": "Fila", "count": waiting},
        {"status": ConversationStatus.IN_PROGRESS.value, "label": "Em atendimento", "count": in_progress},
        {"status": ConversationStatus.FINISHED.value, "label": "Finalizadas hoje", "count": finished_today},
    ]

    avg_first_response = round(sum(first_response_values) / len(first_response_values), 1) if first_response_values else None
    avg_resolution = round(sum(resolution_values) / len(resolution_values), 1) if resolution_values else None
    volume_by_day = []
    for offset in range(6, -1, -1):
        day = now.date() - timedelta(days=offset)
        key = day.isoformat()
        volume_by_day.append(
            {
                "date": key,
                "label": day.strftime("%d/%m"),
                "count": volume_by_day_map.get(key, 0),
            }
        )

    return {
        "generated_at": now.isoformat(),
        "summary": {
            "waiting": waiting,
            "in_progress": in_progress,
            "finished_today": finished_today,
            "online_agents": len(online_agents),
            "avg_first_response_minutes": avg_first_response,
            "avg_resolution_minutes": avg_resolution,
            "sla_overdue": len(overdue_items) + len(stale_items),
        },
        "status_breakdown": status_breakdown,
        "by_agent": by_agent,
        "by_sector": by_sector,
        "volume_by_day": volume_by_day,
        "alerts": alerts,
    }
