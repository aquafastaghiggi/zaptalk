import asyncio
import httpx
import logging
from fastapi import HTTPException
from app.core.config import settings

logger = logging.getLogger(__name__)


class EvolutionService:
    """Cliente HTTP para a Evolution API."""

    def __init__(self):
        self.base_url = settings.EVOLUTION_API_URL.rstrip("/")
        self.headers = {
            "apikey": settings.EVOLUTION_API_KEY,
            "Content-Type": "application/json",
        }

    # ── Instâncias ────────────────────────────────────────────────────
    async def create_instance(self, instance_name: str) -> dict:
        async with httpx.AsyncClient() as client:
            try:
                r = await client.post(
                    f"{self.base_url}/instance/create",
                    headers=self.headers,
                    json={
                        "instanceName": instance_name,
                        "qrcode": True,
                        "integration": "WHATSAPP-BAILEYS",
                    },
                    timeout=30,
                )
                r.raise_for_status()
                return r.json()
            except httpx.HTTPStatusError as exc:
                status_code = exc.response.status_code
                detail = exc.response.text.strip() or "Falha ao criar instancia"
                if status_code == 403:
                    raise HTTPException(
                        status_code=400,
                        detail=(
                            "Nome da instância inválido ou não permitido pela Evolution API. "
                            "Use letras minúsculas, números e underscore, começando com letra."
                        ),
                    ) from exc
                raise HTTPException(status_code=502, detail=detail or "Falha ao criar instancia") from exc
            except httpx.RequestError as exc:
                raise HTTPException(
                    status_code=502,
                    detail="Nao foi possivel alcançar a Evolution API.",
                ) from exc

    async def get_qrcode(self, instance_name: str) -> dict:
        last_payload: dict | None = None

        async with httpx.AsyncClient() as client:
            # A Evolution pode demorar alguns segundos para expor o QR/ pairing.
            # Fazemos algumas tentativas curtas para evitar devolver "count: 0"
            # imediatamente para o front.
            for attempt in range(6):
                r = await client.get(
                    f"{self.base_url}/instance/connect/{instance_name}",
                    headers=self.headers,
                    timeout=15,
                )
                r.raise_for_status()
                payload = r.json()
                last_payload = payload if isinstance(payload, dict) else {"raw": payload}

                normalized = self._normalize_qrcode_response(last_payload)
                if normalized["status"] not in {"pending"}:
                    return normalized

                if attempt < 5:
                    await asyncio.sleep(2)

            status = await self.get_instance_status(instance_name)
            normalized_status = self._normalize_connection_state(status)
            if normalized_status == "open":
                return {
                    "status": "connected",
                    "base64": None,
                    "pairing_code": None,
                    "count": 0,
                    "raw": last_payload or {},
                }

            normalized = self._normalize_qrcode_response(last_payload or {})
            normalized["status"] = "pending"
            return normalized

    async def get_instance_status(self, instance_name: str) -> dict:
        async with httpx.AsyncClient() as client:
            r = await client.get(
                f"{self.base_url}/instance/connectionState/{instance_name}",
                headers=self.headers,
                timeout=10,
            )
            r.raise_for_status()
            return r.json()

    @staticmethod
    def _normalize_connection_state(payload: dict | str | None) -> str:
        if isinstance(payload, dict):
            for key in ("state", "status", "connectionStatus"):
                value = payload.get(key)
                if isinstance(value, str) and value:
                    return value.lower()
        if isinstance(payload, str):
            return payload.lower()
        return "unknown"

    def _normalize_qrcode_response(self, payload: dict) -> dict:
        qrcode = payload.get("qrcode") if isinstance(payload.get("qrcode"), dict) else {}
        base64 = (
            payload.get("base64")
            or qrcode.get("base64")
            or qrcode.get("image")
            or qrcode.get("code")
        )
        pairing_code = (
            payload.get("pairingCode")
            or payload.get("pairing_code")
            or qrcode.get("pairingCode")
            or qrcode.get("pairing_code")
        )
        code = payload.get("code") or qrcode.get("code")
        count = payload.get("count")

        if base64:
            return {
                "status": "qr",
                "base64": base64,
                "pairing_code": pairing_code,
                "code": code,
                "count": count,
                "raw": payload,
            }

        if pairing_code or code:
            return {
                "status": "pairing_code",
                "base64": None,
                "pairing_code": pairing_code,
                "code": code,
                "count": count,
                "raw": payload,
            }

        if count == 0:
            return {
                "status": "pending",
                "base64": None,
                "pairing_code": None,
                "code": None,
                "count": count,
                "raw": payload,
            }

        return {
            "status": "unknown",
            "base64": None,
            "pairing_code": pairing_code,
            "code": code,
            "count": count,
            "raw": payload,
        }

    async def list_instances(self) -> list:
        async with httpx.AsyncClient() as client:
            r = await client.get(
                f"{self.base_url}/instance/fetchInstances",
                headers=self.headers,
                timeout=10,
            )
            r.raise_for_status()
            return r.json()

    async def logout_instance(self, instance_name: str) -> dict:
        async with httpx.AsyncClient() as client:
            # Evolution tem variações de implementação entre versões.
            # Tentamos a rota mais comum primeiro e fazemos fallback se necessário.
            for method in ("post", "delete"):
                request = getattr(client, method)
                r = await request(
                    f"{self.base_url}/instance/logout/{instance_name}",
                    headers=self.headers,
                    timeout=10,
                )
                if r.status_code < 400:
                    return r.json() if r.content else {"ok": True}
            r.raise_for_status()
            return r.json()

    async def restart_instance(self, instance_name: str) -> dict:
        async with httpx.AsyncClient() as client:
            r = await client.put(
                f"{self.base_url}/instance/restart/{instance_name}",
                headers=self.headers,
                timeout=20,
            )
            r.raise_for_status()
            return r.json()

    async def delete_instance(self, instance_name: str) -> dict:
        async with httpx.AsyncClient() as client:
            # Em algumas versões da Evolution a instância precisa ser
            # desconectada antes da remoção completa. Tentamos derrubar a
            # sessão primeiro e depois excluir.
            for method in ("delete", "post"):
                request = getattr(client, method)
                try:
                    r = await request(
                        f"{self.base_url}/instance/logout/{instance_name}",
                        headers=self.headers,
                        timeout=10,
                    )
                    if r.status_code < 400:
                        break
                except httpx.RequestError:
                    break

            r = await client.delete(
                f"{self.base_url}/instance/delete/{instance_name}",
                headers=self.headers,
                timeout=20,
            )
            if r.status_code == 404:
                return {
                    "status": "SUCCESS",
                    "error": False,
                    "response": {"message": "Instance already deleted"},
                }
            r.raise_for_status()
            return r.json()

    # ── Envio de mensagens ────────────────────────────────────────────
    async def send_text(self, instance: str, phone: str, text: str) -> dict:
        """Envia mensagem de texto simples."""
        async with httpx.AsyncClient() as client:
            r = await client.post(
                f"{self.base_url}/message/sendText/{instance}",
                headers=self.headers,
                json={
                    "number": self._format_phone(phone),
                    "text": text,
                },
                timeout=20,
            )
            r.raise_for_status()
            return r.json()

    async def send_media(
        self, instance: str, phone: str, media_url: str,
        media_type: str, caption: str = ""
    ) -> dict:
        """Envia imagem, vídeo ou documento via URL."""
        async with httpx.AsyncClient() as client:
            r = await client.post(
                f"{self.base_url}/message/sendMedia/{instance}",
                headers=self.headers,
                json={
                    "number": self._format_phone(phone),
                    "mediatype": media_type,  # image | video | document
                    "media": media_url,
                    "caption": caption,
                },
                timeout=30,
            )
            r.raise_for_status()
            return r.json()

    # ── Utilitários ───────────────────────────────────────────────────
    @staticmethod
    def _format_phone(phone: str) -> str:
        """Garante formato internacional sem + (ex: 5551999999999)."""
        return phone.replace("+", "").replace(" ", "").replace("-", "")
