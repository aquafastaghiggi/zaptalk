from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import require_manager_or_admin
from app.db.database import get_db
from app.models.user import User
from app.services.dashboard_service import get_operational_dashboard

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/overview")
async def overview(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_manager_or_admin),
):
    return await get_operational_dashboard(db)
