from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from sqlalchemy import select, update
from app.db.database import AsyncSessionLocal
from app.models.user import User
from app.core.security import decode_token
from app.websocket.manager import ws_manager
import logging

router = APIRouter(tags=["websocket"])
logger = logging.getLogger(__name__)


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(...),
):
    """
    Conexão WebSocket autenticada via query param:
    ws://localhost:8000/ws?token=<jwt>
    """
    payload = decode_token(token)
    if not payload:
        await websocket.close(code=4001, reason="Token inválido")
        return

    user_id: str = payload.get("sub")

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()

    if not user or not user.is_active:
        await websocket.close(code=4001, reason="Usuário não encontrado")
        return

    # Marca atendente como online
    async with AsyncSessionLocal() as db:
        await db.execute(
            update(User).where(User.id == user_id).values(is_online=True)
        )
        await db.commit()

    await ws_manager.connect(websocket, user_id)

    try:
        while True:
            # Mantém a conexão viva (ping/pong)
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")

    except WebSocketDisconnect:
        ws_manager.disconnect(user_id)

        # Marca atendente como offline
        async with AsyncSessionLocal() as db:
            await db.execute(
                update(User).where(User.id == user_id).values(is_online=False)
            )
            await db.commit()

        logger.info(f"Atendente {user_id} desconectado")
