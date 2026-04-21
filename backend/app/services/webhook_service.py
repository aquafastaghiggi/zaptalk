from datetime import datetime, timezone
import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.contact import Contact
from app.models.conversation import Conversation, ConversationStatus
from app.models.message import Message, MessageDirection, MessageType
from app.services.audit_service import record_audit_log
from app.services.conversation_service import auto_assign_conversation, conversation_payload
from app.websocket.manager import ws_manager

logger = logging.getLogger(__name__)


def _parse_message_type(msg_data: dict) -> tuple[MessageType, str | None]:
    """Extracts the message type and content from the Evolution payload."""
    if "conversation" in msg_data:
        return MessageType.TEXT, msg_data["conversation"]
    if "extendedTextMessage" in msg_data:
        return MessageType.TEXT, msg_data["extendedTextMessage"].get("text")
    if "imageMessage" in msg_data:
        return MessageType.IMAGE, msg_data["imageMessage"].get("url")
    if "audioMessage" in msg_data:
        return MessageType.AUDIO, msg_data["audioMessage"].get("url")
    if "videoMessage" in msg_data:
        return MessageType.VIDEO, msg_data["videoMessage"].get("url")
    if "documentMessage" in msg_data:
        return MessageType.DOCUMENT, msg_data["documentMessage"].get("url")
    if "stickerMessage" in msg_data:
        return MessageType.STICKER, None
    return MessageType.TEXT, None


async def process_incoming_webhook(db: AsyncSession, payload: dict):
    """
    Central entry point for Evolution API events.
    Currently handles messages.upsert events.
    """
    event = payload.get("event")

    if event == "messages.upsert":
        await _handle_message_upsert(db, payload)
    else:
        logger.debug(f"Ignored event: {event}")


async def _handle_message_upsert(db: AsyncSession, payload: dict):
    data = payload.get("data", {})
    instance_name = payload.get("instance", "default")

    key = data.get("key", {})
    from_me = key.get("fromMe", False)

    if from_me:
        return

    remote_jid: str = key.get("remoteJid", "")
    if not remote_jid or "@g.us" in remote_jid:
        return

    phone = remote_jid.replace("@s.whatsapp.net", "")
    push_name: str = data.get("pushName", "")
    msg_data: dict = data.get("message", {})
    whatsapp_msg_id: str = key.get("id", "")

    msg_type, content = _parse_message_type(msg_data)

    result = await db.execute(select(Contact).where(Contact.phone == phone))
    contact = result.scalar_one_or_none()

    if not contact:
        contact = Contact(phone=phone, name=push_name or None)
        db.add(contact)
        await db.flush()
        logger.info(f"New contact created: {phone}")
        await record_audit_log(
            db,
            action="contact.created",
            entity_type="contact",
            entity_id=contact.id,
            details={
                "phone": contact.phone,
                "name": contact.name,
            },
        )
    elif push_name and not contact.name:
        contact.name = push_name
        await record_audit_log(
            db,
            action="contact.updated",
            entity_type="contact",
            entity_id=contact.id,
            details={
                "phone": contact.phone,
                "name": contact.name,
                "source": "webhook",
            },
        )

    result = await db.execute(
        select(Conversation)
        .where(
            Conversation.contact_id == contact.id,
            Conversation.status != ConversationStatus.FINISHED,
        )
        .options(
            selectinload(Conversation.contact),
            selectinload(Conversation.agent),
            selectinload(Conversation.sector),
        )
        .order_by(Conversation.started_at.desc())
    )
    conv = result.scalar_one_or_none()

    created_conversation = False
    if not conv:
        conv = Conversation(
            contact_id=contact.id,
            contact=contact,
            whatsapp_instance=instance_name,
            status=ConversationStatus.WAITING,
        )
        db.add(conv)
        await db.flush()
        logger.info(f"New conversation created for {phone}")
        created_conversation = True
        await record_audit_log(
            db,
            action="conversation.created",
            entity_type="conversation",
            entity_id=conv.id,
            details={
                "contact_id": contact.id,
                "whatsapp_instance": instance_name,
                "status": conv.status.value,
            },
        )

    msg = Message(
        conversation_id=conv.id,
        direction=MessageDirection.INBOUND,
        message_type=msg_type,
        content=content if msg_type == MessageType.TEXT else None,
        media_url=content if msg_type != MessageType.TEXT else None,
        whatsapp_message_id=whatsapp_msg_id,
    )
    db.add(msg)

    conv.last_message_at = datetime.now(timezone.utc)
    conv.unread_count += 1
    await db.flush()

    if conv.status == ConversationStatus.WAITING:
        assigned = await auto_assign_conversation(db, conv.id)
        if assigned:
            conv = assigned

    if created_conversation:
        await ws_manager.broadcast("new_conversation", conversation_payload(conv))

    event_data = {
        "conversation_id": conv.id,
        "message": {
            "id": msg.id,
            "content": msg.content,
            "media_url": msg.media_url,
            "message_type": msg.message_type.value,
            "direction": msg.direction.value,
            "created_at": msg.created_at.isoformat(),
        },
        "contact": {
            "phone": phone,
            "name": contact.name,
        },
        "unread_count": conv.unread_count,
    }

    if conv.agent_id:
        await ws_manager.send_to(conv.agent_id, "new_message", event_data)
    else:
        await ws_manager.broadcast("new_message", event_data)

    logger.info(f"Message {msg_type} saved | conversation {conv.id}")
