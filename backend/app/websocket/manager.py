from fastapi import WebSocket
from typing import Dict, Set
import json
import logging

logger = logging.getLogger(__name__)


class ConnectionManager:
    """
    Gerencia conexões WebSocket de atendentes.
    Cada atendente conecta uma vez e recebe eventos em tempo real.
    """

    def __init__(self):
        # user_id -> WebSocket
        self.active: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        self.active[user_id] = websocket
        logger.info(f"WS conectado: {user_id} | total: {len(self.active)}")

    def disconnect(self, user_id: str):
        self.active.pop(user_id, None)
        logger.info(f"WS desconectado: {user_id} | total: {len(self.active)}")

    async def send_to(self, user_id: str, event: str, data: dict):
        """Envia evento para um atendente específico."""
        ws = self.active.get(user_id)
        if ws:
            try:
                await ws.send_text(json.dumps({"event": event, "data": data}))
            except Exception as e:
                logger.warning(f"Falha ao enviar para {user_id}: {e}")
                self.disconnect(user_id)

    async def broadcast(self, event: str, data: dict, exclude: Set[str] = None):
        """Envia evento para todos os atendentes conectados."""
        exclude = exclude or set()
        disconnected = []
        for user_id, ws in self.active.items():
            if user_id in exclude:
                continue
            try:
                await ws.send_text(json.dumps({"event": event, "data": data}))
            except Exception:
                disconnected.append(user_id)

        for uid in disconnected:
            self.disconnect(uid)


# Instância global (singleton)
ws_manager = ConnectionManager()
