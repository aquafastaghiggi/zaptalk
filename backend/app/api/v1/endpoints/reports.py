from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from datetime import date
from io import StringIO

from app.core.deps import require_manager_or_admin
from app.db.database import get_db
from app.models.user import User
from app.services.reports_service import build_reports_overview, build_reports_csv

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/overview")
async def overview(
    date_from: date | None = Query(None),
    date_to: date | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_manager_or_admin),
):
    return await build_reports_overview(db, date_from=date_from, date_to=date_to)


@router.get("/export.csv")
async def export_csv(
    date_from: date | None = Query(None),
    date_to: date | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_manager_or_admin),
):
    content = await build_reports_csv(db, date_from=date_from, date_to=date_to)
    return StreamingResponse(
        StringIO(content),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="zaptalk-relatorio.csv"'},
    )
