import json
import logging
import re
from typing import Any

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.models.conversation import Conversation
from app.models.conversation_note import ConversationNote
from app.models.conversation_tag import ConversationTag
from app.models.conversation_transfer import ConversationTransferLog
from app.models.message import Message
from app.models.user import User
from app.services.audit_service import record_audit_log

logger = logging.getLogger(__name__)


SUMMARY_SCHEMA = {
    "type": "object",
    "properties": {
        "summary": {"type": "string"},
        "highlights": {
            "type": "array",
            "items": {"type": "string"},
        },
        "next_steps": {
            "type": "array",
            "items": {"type": "string"},
        },
        "customer_mood": {"type": "string"},
        "confidence": {"type": "number", "minimum": 0, "maximum": 1},
    },
    "required": ["summary", "highlights", "next_steps", "customer_mood", "confidence"],
    "additionalProperties": False,
}

SUGGEST_REPLY_SCHEMA = {
    "type": "object",
    "properties": {
        "reply": {"type": "string"},
        "rationale": {"type": "string"},
        "alternative_replies": {
            "type": "array",
            "items": {"type": "string"},
        },
    },
    "required": ["reply", "rationale", "alternative_replies"],
    "additionalProperties": False,
}

CLASSIFY_SCHEMA = {
    "type": "object",
    "properties": {
        "subject": {"type": "string"},
        "urgency": {
            "type": "string",
            "enum": ["low", "medium", "high", "critical"],
        },
        "suggested_tags": {
            "type": "array",
            "items": {"type": "string"},
        },
        "suggested_sector": {"type": "string"},
        "stage": {"type": "string"},
        "confidence": {"type": "number", "minimum": 0, "maximum": 1},
    },
    "required": ["subject", "urgency", "suggested_tags", "suggested_sector", "stage", "confidence"],
    "additionalProperties": False,
}

TRANSFER_SCHEMA = {
    "type": "object",
    "properties": {
        "summary": {"type": "string"},
        "reason": {"type": "string"},
        "important_context": {
            "type": "array",
            "items": {"type": "string"},
        },
        "handoff_points": {
            "type": "array",
            "items": {"type": "string"},
        },
    },
    "required": ["summary", "reason", "important_context", "handoff_points"],
    "additionalProperties": False,
}

SENTIMENT_SCHEMA = {
    "type": "object",
    "properties": {
        "sentiment": {
            "type": "string",
            "enum": ["positive", "neutral", "negative", "mixed"],
        },
        "score": {"type": "number", "minimum": -1, "maximum": 1},
        "risk_level": {
            "type": "string",
            "enum": ["low", "medium", "high"],
        },
        "signals": {
            "type": "array",
            "items": {"type": "string"},
        },
        "summary": {"type": "string"},
    },
    "required": ["sentiment", "score", "risk_level", "signals", "summary"],
    "additionalProperties": False,
}


def ai_status() -> dict[str, Any]:
    api_key = settings.OPENAI_API_KEY.strip()
    configured = bool(api_key)
    enabled = bool(settings.AI_ENABLED and configured)

    reason = None
    if not configured:
        reason = "missing_api_key"
    elif not settings.AI_ENABLED:
        reason = "disabled"

    return {
        "enabled": enabled,
        "configured": configured,
        "provider": "openai",
        "reason": reason,
        "models": {
            "summary": settings.AI_MODEL_SUMMARY,
            "suggest_reply": settings.AI_MODEL_SUGGEST_REPLY,
            "classify": settings.AI_MODEL_CLASSIFY,
            "transfer_summary": settings.AI_MODEL_TRANSFER_SUMMARY,
            "sentiment": settings.AI_MODEL_SENTIMENT,
        },
        "features": [
            "summary",
            "suggest_reply",
            "classification",
            "transfer_summary",
            "sentiment",
        ],
        "hint": "Defina AI_ENABLED=true e OPENAI_API_KEY para liberar o recurso.",
    }


def _require_ai_enabled() -> None:
    status = ai_status()
    if not status["enabled"]:
        raise HTTPException(
            status_code=503,
            detail="Recurso de IA desativado. Configure AI_ENABLED=true e OPENAI_API_KEY para habilitar.",
        )


def _json_from_output_text(output_text: str) -> dict[str, Any]:
    cleaned = output_text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?", "", cleaned, flags=re.IGNORECASE).strip()
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3].strip()

    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError:
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start != -1 and end != -1 and end > start:
            parsed = json.loads(cleaned[start : end + 1])
        else:
            raise HTTPException(status_code=502, detail="Nao foi possivel ler a resposta da IA")

    if not isinstance(parsed, dict):
        raise HTTPException(status_code=502, detail="Resposta da IA em formato inesperado")
    return parsed


def _truncate(value: str | None, max_len: int = 600) -> str | None:
    if value is None:
        return None
    text = value.strip()
    if len(text) <= max_len:
        return text
    return f"{text[:max_len].rstrip()}..."


async def _load_conversation_context(db: AsyncSession, conversation_id: str) -> dict[str, Any]:
    result = await db.execute(
        select(Conversation)
        .where(Conversation.id == conversation_id)
        .options(
            selectinload(Conversation.contact),
            selectinload(Conversation.agent),
            selectinload(Conversation.sector),
            selectinload(Conversation.notes).selectinload(ConversationNote.created_by),
            selectinload(Conversation.tags).selectinload(ConversationTag.created_by),
            selectinload(Conversation.transfer_logs).selectinload(ConversationTransferLog.created_by),
        )
    )
    conversation = result.scalar_one_or_none()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversa nao encontrada")

    messages_result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .options(selectinload(Message.sender))
        .order_by(Message.created_at.desc())
        .limit(settings.AI_MAX_CONTEXT_MESSAGES)
    )
    recent_messages = list(reversed(messages_result.scalars().all()))

    return {
        "conversation": {
            "id": conversation.id,
            "status": conversation.status.value,
            "priority": conversation.priority,
            "is_pinned": conversation.is_pinned,
            "unread_count": conversation.unread_count,
            "started_at": conversation.started_at.isoformat() if conversation.started_at else None,
            "last_message_at": conversation.last_message_at.isoformat() if conversation.last_message_at else None,
            "finished_at": conversation.finished_at.isoformat() if conversation.finished_at else None,
        },
        "contact": {
            "id": conversation.contact.id if conversation.contact else None,
            "phone": conversation.contact.phone if conversation.contact else None,
            "name": conversation.contact.name if conversation.contact else None,
            "company": conversation.contact.company if conversation.contact else None,
            "origin": conversation.contact.origin if conversation.contact else None,
            "stage": conversation.contact.stage if conversation.contact else None,
            "notes": conversation.contact.notes if conversation.contact else None,
            "responsible_user_id": conversation.contact.responsible_user_id if conversation.contact else None,
        },
        "agent": {
            "id": conversation.agent.id if conversation.agent else None,
            "name": conversation.agent.name if conversation.agent else None,
            "role": conversation.agent.role.value if conversation.agent else None,
            "sector_id": conversation.agent.sector_id if conversation.agent else None,
        },
        "sector": {
            "id": conversation.sector.id if conversation.sector else None,
            "name": conversation.sector.name if conversation.sector else None,
            "description": conversation.sector.description if conversation.sector else None,
            "routing_keywords": conversation.sector.routing_keywords if conversation.sector else None,
        },
        "recent_messages": [
            {
                "id": message.id,
                "direction": message.direction.value,
                "message_type": message.message_type.value,
                "content": message.content,
                "media_url": message.media_url,
                "created_at": message.created_at.isoformat() if message.created_at else None,
                "sender": {
                    "id": message.sender.id,
                    "name": message.sender.name,
                    "role": message.sender.role.value,
                }
                if message.sender
                else None,
            }
            for message in recent_messages
        ],
        "notes": [
            {
                "id": note.id,
                "content": note.content,
                "created_at": note.created_at.isoformat() if note.created_at else None,
                "created_by": {
                    "id": note.created_by.id,
                    "name": note.created_by.name,
                }
                if note.created_by
                else None,
            }
            for note in list(conversation.notes)[-settings.AI_MAX_CONTEXT_NOTES :]
        ],
        "tags": [tag.label for tag in conversation.tags],
        "transfers": [
            {
                "id": transfer.id,
                "from_agent_id": transfer.from_agent_id,
                "to_agent_id": transfer.to_agent_id,
                "from_sector_id": transfer.from_sector_id,
                "to_sector_id": transfer.to_sector_id,
                "reason": transfer.reason,
                "created_at": transfer.created_at.isoformat() if transfer.created_at else None,
            }
            for transfer in list(conversation.transfer_logs)[-settings.AI_MAX_CONTEXT_TRANSFERS :]
        ],
    }


async def _generate_structured(
    *,
    model: str,
    schema_name: str,
    schema: dict[str, Any],
    instructions: str,
    payload: dict[str, Any],
    effort: str = "low",
) -> dict[str, Any]:
    _require_ai_enabled()

    try:
        from openai import AsyncOpenAI
    except ModuleNotFoundError as exc:  # pragma: no cover - runtime dependency guard
        raise HTTPException(
            status_code=503,
            detail="Dependencia openai nao instalada no ambiente.",
        ) from exc

    client = AsyncOpenAI(
        api_key=settings.OPENAI_API_KEY.strip(),
        base_url=settings.OPENAI_API_BASE_URL.strip() or None,
    )

    try:
        response = await client.responses.create(
            model=model,
            instructions=instructions,
            input=json.dumps(payload, ensure_ascii=False),
            reasoning={"effort": effort},
            text={
                "format": {
                    "type": "json_schema",
                    "name": schema_name,
                    "schema": schema,
                    "strict": True,
                }
            },
            temperature=0.2,
        )
    except Exception as exc:  # pragma: no cover - transport/runtime errors
        logger.exception("Erro ao chamar IA")
        raise HTTPException(status_code=502, detail="Falha ao consultar a IA") from exc

    output_text = getattr(response, "output_text", "") or ""
    if not output_text.strip():
        raise HTTPException(status_code=502, detail="Resposta vazia da IA")

    return _json_from_output_text(output_text)


async def generate_summary(
    db: AsyncSession,
    conversation_id: str,
    *,
    created_by: User | None = None,
) -> dict[str, Any]:
    context = await _load_conversation_context(db, conversation_id)
    result = await _generate_structured(
        model=settings.AI_MODEL_SUMMARY,
        schema_name="conversation_summary",
        schema=SUMMARY_SCHEMA,
        instructions=(
            "Voce e um assistente de operacoes de atendimento. "
            "Resuma a conversa em portugues do Brasil, de forma objetiva, "
            "sem inventar fatos e sem recomendar acao fora do contexto."
        ),
        payload=context,
        effort="low",
    )
    await record_audit_log(
        db,
        action="ai.summary.generated",
        entity_type="conversation",
        entity_id=conversation_id,
        actor=created_by,
        details={
            "model": settings.AI_MODEL_SUMMARY,
            "summary": _truncate(result.get("summary")),
        },
    )
    return {
        "conversation_id": conversation_id,
        "model": settings.AI_MODEL_SUMMARY,
        "result": result,
    }


async def suggest_reply(
    db: AsyncSession,
    conversation_id: str,
    *,
    created_by: User | None = None,
) -> dict[str, Any]:
    context = await _load_conversation_context(db, conversation_id)
    result = await _generate_structured(
        model=settings.AI_MODEL_SUGGEST_REPLY,
        schema_name="conversation_reply_suggestion",
        schema=SUGGEST_REPLY_SCHEMA,
        instructions=(
            "Voce e um assistente para atendentes. "
            "Sugira uma resposta curta, humana e profissional em portugues do Brasil. "
            "Nao envie texto exagerado, nao invente dados e mantenha o tom apropriado ao contexto."
        ),
        payload=context,
        effort="low",
    )
    await record_audit_log(
        db,
        action="ai.reply_suggested",
        entity_type="conversation",
        entity_id=conversation_id,
        actor=created_by,
        details={
            "model": settings.AI_MODEL_SUGGEST_REPLY,
            "reply": _truncate(result.get("reply")),
        },
    )
    return {
        "conversation_id": conversation_id,
        "model": settings.AI_MODEL_SUGGEST_REPLY,
        "result": result,
    }


async def classify_conversation(
    db: AsyncSession,
    conversation_id: str,
    *,
    created_by: User | None = None,
) -> dict[str, Any]:
    context = await _load_conversation_context(db, conversation_id)
    result = await _generate_structured(
        model=settings.AI_MODEL_CLASSIFY,
        schema_name="conversation_classification",
        schema=CLASSIFY_SCHEMA,
        instructions=(
            "Voce e um classificador de atendimento. "
            "Classifique o assunto, urgencia, tags e setor sugerido em portugues do Brasil. "
            "Use somente o contexto recebido e mantenha a saida estruturada."
        ),
        payload=context,
        effort="low",
    )
    await record_audit_log(
        db,
        action="ai.classification.generated",
        entity_type="conversation",
        entity_id=conversation_id,
        actor=created_by,
        details={
            "model": settings.AI_MODEL_CLASSIFY,
            "subject": _truncate(result.get("subject")),
            "urgency": result.get("urgency"),
        },
    )
    return {
        "conversation_id": conversation_id,
        "model": settings.AI_MODEL_CLASSIFY,
        "result": result,
    }


async def transfer_summary(
    db: AsyncSession,
    conversation_id: str,
    *,
    created_by: User | None = None,
) -> dict[str, Any]:
    context = await _load_conversation_context(db, conversation_id)
    result = await _generate_structured(
        model=settings.AI_MODEL_TRANSFER_SUMMARY,
        schema_name="conversation_transfer_summary",
        schema=TRANSFER_SCHEMA,
        instructions=(
            "Voce e um assistente de repasse entre atendentes. "
            "Crie um resumo de transferencia curto, objetivo e util para o proximo atendente."
        ),
        payload=context,
        effort="medium",
    )
    await record_audit_log(
        db,
        action="ai.transfer_summary.generated",
        entity_type="conversation",
        entity_id=conversation_id,
        actor=created_by,
        details={
            "model": settings.AI_MODEL_TRANSFER_SUMMARY,
            "summary": _truncate(result.get("summary")),
        },
    )
    return {
        "conversation_id": conversation_id,
        "model": settings.AI_MODEL_TRANSFER_SUMMARY,
        "result": result,
    }


async def analyze_sentiment(
    db: AsyncSession,
    conversation_id: str,
    *,
    created_by: User | None = None,
) -> dict[str, Any]:
    context = await _load_conversation_context(db, conversation_id)
    result = await _generate_structured(
        model=settings.AI_MODEL_SENTIMENT,
        schema_name="conversation_sentiment_analysis",
        schema=SENTIMENT_SCHEMA,
        instructions=(
            "Voce e um analista de sentimento de atendimento. "
            "Analise o tom da conversa em portugues do Brasil e retorne sinais claros, score e risco."
        ),
        payload=context,
        effort="low",
    )
    await record_audit_log(
        db,
        action="ai.sentiment.generated",
        entity_type="conversation",
        entity_id=conversation_id,
        actor=created_by,
        details={
            "model": settings.AI_MODEL_SENTIMENT,
            "sentiment": result.get("sentiment"),
            "risk_level": result.get("risk_level"),
        },
    )
    return {
        "conversation_id": conversation_id,
        "model": settings.AI_MODEL_SENTIMENT,
        "result": result,
    }
