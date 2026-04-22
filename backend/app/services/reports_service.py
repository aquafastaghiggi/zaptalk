from __future__ import annotations

import csv
import io
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.conversation import Conversation, ConversationStatus
from app.models.message import Message, MessageDirection
from app.models.user import User

SAO_PAULO = timezone(timedelta(hours=-3))


def _local_date(value: datetime | None) -> date | None:
    if value is None:
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(SAO_PAULO).date()


async def build_reports_overview(
    db: AsyncSession,
    *,
    date_from: date | None = None,
    date_to: date | None = None,
) -> dict:
    query = (
        select(Conversation)
        .options(
            selectinload(Conversation.contact),
            selectinload(Conversation.agent).selectinload(User.sector),
            selectinload(Conversation.sector),
        )
        .order_by(Conversation.started_at.desc())
    )
    if date_from:
        query = query.where(func.date(Conversation.started_at) >= date_from.isoformat())
    if date_to:
        query = query.where(func.date(Conversation.started_at) <= date_to.isoformat())

    result = await db.execute(query)
    conversations = result.scalars().all()

    messages_query = select(Message).options(selectinload(Message.conversation))
    if date_from:
        messages_query = messages_query.where(func.date(Message.created_at) >= date_from.isoformat())
    if date_to:
        messages_query = messages_query.where(func.date(Message.created_at) <= date_to.isoformat())

    messages_result = await db.execute(messages_query)
    messages = messages_result.scalars().all()

    by_day: dict[str, dict] = {}
    by_agent: dict[str, dict] = {}
    by_sector: dict[str, dict] = {}
    by_stage: dict[str, int] = {}

    for conv in conversations:
        day = _local_date(conv.started_at)
        if day:
            day_key = day.isoformat()
            by_day.setdefault(day_key, {"date": day_key, "count": 0, "finished": 0, "waiting": 0, "in_progress": 0})
            by_day[day_key]["count"] += 1
            if conv.status == ConversationStatus.FINISHED:
                by_day[day_key]["finished"] += 1
            elif conv.status == ConversationStatus.WAITING:
                by_day[day_key]["waiting"] += 1
            else:
                by_day[day_key]["in_progress"] += 1

        if conv.agent:
            bucket = by_agent.setdefault(
                conv.agent.id,
                {
                    "id": conv.agent.id,
                    "name": conv.agent.name,
                    "role": conv.agent.role.value,
                    "sector": conv.agent.sector.name if conv.agent.sector else None,
                    "conversations": 0,
                    "finished": 0,
                },
            )
            bucket["conversations"] += 1
            if conv.status == ConversationStatus.FINISHED:
                bucket["finished"] += 1

        if conv.sector:
            bucket = by_sector.setdefault(
                conv.sector.id,
                {
                    "id": conv.sector.id,
                    "name": conv.sector.name,
                    "conversations": 0,
                    "waiting": 0,
                    "in_progress": 0,
                    "finished": 0,
                },
            )
            bucket["conversations"] += 1
            if conv.status == ConversationStatus.WAITING:
                bucket["waiting"] += 1
            elif conv.status == ConversationStatus.IN_PROGRESS:
                bucket["in_progress"] += 1
            else:
                bucket["finished"] += 1

        contact_stage = (conv.contact.stage or "nao_informado") if conv.contact else "nao_informado"
        by_stage[contact_stage] = by_stage.get(contact_stage, 0) + 1

    total_messages = len(messages)
    inbound_messages = sum(1 for msg in messages if msg.direction == MessageDirection.INBOUND)
    outbound_messages = sum(1 for msg in messages if msg.direction == MessageDirection.OUTBOUND)

    stage_rows = [{"stage": stage, "count": count} for stage, count in sorted(by_stage.items(), key=lambda item: item[1], reverse=True)]
    day_rows = sorted(by_day.values(), key=lambda item: item["date"], reverse=True)
    agent_rows = sorted(by_agent.values(), key=lambda item: (item["conversations"], item["name"]), reverse=True)
    sector_rows = sorted(by_sector.values(), key=lambda item: (item["conversations"], item["name"]), reverse=True)

    return {
        "generated_at": datetime.now(tz=SAO_PAULO).isoformat(),
        "summary": {
            "total_conversations": len(conversations),
            "waiting": sum(1 for conv in conversations if conv.status == ConversationStatus.WAITING),
            "in_progress": sum(1 for conv in conversations if conv.status == ConversationStatus.IN_PROGRESS),
            "finished": sum(1 for conv in conversations if conv.status == ConversationStatus.FINISHED),
            "total_messages": total_messages,
            "inbound_messages": inbound_messages,
            "outbound_messages": outbound_messages,
        },
        "by_day": day_rows,
        "by_agent": agent_rows,
        "by_sector": sector_rows,
        "by_stage": stage_rows,
    }


async def build_reports_csv(
    db: AsyncSession,
    *,
    date_from: date | None = None,
    date_to: date | None = None,
) -> str:
    query = (
        select(Conversation)
        .options(
            selectinload(Conversation.contact),
            selectinload(Conversation.agent),
            selectinload(Conversation.sector),
        )
        .order_by(Conversation.started_at.desc())
    )
    if date_from:
        query = query.where(func.date(Conversation.started_at) >= date_from.isoformat())
    if date_to:
        query = query.where(func.date(Conversation.started_at) <= date_to.isoformat())

    result = await db.execute(query)
    conversations = result.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "conversation_id",
        "contact_name",
        "phone",
        "status",
        "sector",
        "agent",
        "stage",
        "company",
        "origin",
        "priority",
        "started_at",
        "finished_at",
        "last_message_at",
    ])

    for conv in conversations:
        writer.writerow([
            conv.id,
            conv.contact.name if conv.contact else "",
            conv.contact.phone if conv.contact else "",
            conv.status.value,
            conv.sector.name if conv.sector else "",
            conv.agent.name if conv.agent else "",
            conv.contact.stage if conv.contact else "",
            conv.contact.company if conv.contact else "",
            conv.contact.origin if conv.contact else "",
            conv.priority,
            conv.started_at.isoformat() if conv.started_at else "",
            conv.finished_at.isoformat() if conv.finished_at else "",
            conv.last_message_at.isoformat() if conv.last_message_at else "",
        ])

    return output.getvalue()
