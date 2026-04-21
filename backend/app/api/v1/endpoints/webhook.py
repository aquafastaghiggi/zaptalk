from fastapi import APIRouter, Depends, Request, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.services.webhook_service import process_incoming_webhook
from app.core.config import settings
import logging

router = APIRouter(prefix="/webhook", tags=["webhook"])
logger = logging.getLogger(__name__)


@router.post("/evolution")
async def evolution_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Recebe todos os eventos da Evolution API.
    A Evolution envia para: POST /api/v1/webhook/evolution
    """
    # Validação simples de origem (opcional mas recomendado)
    api_key = request.headers.get("apikey", "")
    if api_key and api_key != settings.EVOLUTION_API_KEY:
        raise HTTPException(status_code=403, detail="API key inválida")

    try:
        payload = await request.json()
        logger.debug(f"Webhook recebido: {payload.get('event')}")
        await process_incoming_webhook(db, payload)
        return {"ok": True}
    except Exception as e:
        logger.error(f"Erro ao processar webhook: {e}", exc_info=True)
        # Retorna 200 para a Evolution não ficar reenviando
        return {"ok": False, "error": str(e)}
