from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import require_manager_or_admin
from app.db.database import get_db
from app.models.user import User
from app.services import ai_service as svc

router = APIRouter(prefix="/ai", tags=["ai"])


@router.get("/status")
async def get_status(
    _: User = Depends(require_manager_or_admin),
):
    return svc.ai_status()


@router.post("/conversations/{conversation_id}/summary")
async def conversation_summary(
    conversation_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_manager_or_admin),
):
    return await svc.generate_summary(db, conversation_id, created_by=current_user)


@router.post("/conversations/{conversation_id}/suggest-reply")
async def conversation_suggest_reply(
    conversation_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_manager_or_admin),
):
    return await svc.suggest_reply(db, conversation_id, created_by=current_user)


@router.post("/conversations/{conversation_id}/classify")
async def conversation_classify(
    conversation_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_manager_or_admin),
):
    return await svc.classify_conversation(db, conversation_id, created_by=current_user)


@router.post("/conversations/{conversation_id}/transfer-summary")
async def conversation_transfer_summary(
    conversation_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_manager_or_admin),
):
    return await svc.transfer_summary(db, conversation_id, created_by=current_user)


@router.post("/conversations/{conversation_id}/sentiment")
async def conversation_sentiment(
    conversation_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_manager_or_admin),
):
    return await svc.analyze_sentiment(db, conversation_id, created_by=current_user)
