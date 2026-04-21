from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from pydantic import BaseModel

from app.db.database import get_db
from app.core.deps import get_current_user, require_manager_or_admin
from app.models.sector import Sector
from app.models.user import User
from app.services.audit_service import record_audit_log

router = APIRouter(prefix="/sectors", tags=["sectors"])


class SectorCreate(BaseModel):
    name: str
    description: str | None = None


class SectorUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    is_active: bool | None = None


class SectorOut(BaseModel):
    id: str
    name: str
    description: str | None = None
    is_active: bool
    model_config = {"from_attributes": True}


@router.get("", response_model=List[SectorOut])
async def list_sectors(
    include_inactive: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    query = select(Sector)
    if not include_inactive:
        query = query.where(Sector.is_active == True)  # noqa: E712
    result = await db.execute(query.order_by(Sector.name))
    return result.scalars().all()


@router.post("", response_model=SectorOut, status_code=201)
async def create_sector(
    body: SectorCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_manager_or_admin),
):
    sector = Sector(name=body.name, description=body.description)
    db.add(sector)
    await db.flush()
    await record_audit_log(
        db,
        action="sector.created",
        entity_type="sector",
        entity_id=sector.id,
        actor=current_user,
        details={
            "name": sector.name,
            "description": sector.description,
        },
    )
    return sector


@router.patch("/{sector_id}", response_model=SectorOut)
async def update_sector(
    sector_id: str,
    body: SectorUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_manager_or_admin),
):
    result = await db.execute(select(Sector).where(Sector.id == sector_id))
    sector = result.scalar_one_or_none()
    if not sector:
        raise HTTPException(status_code=404, detail="Setor nao encontrado")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(sector, field, value)

    await db.flush()
    await record_audit_log(
        db,
        action="sector.updated",
        entity_type="sector",
        entity_id=sector.id,
        actor=current_user,
        details=body.model_dump(exclude_unset=True),
    )
    return sector


@router.delete("/{sector_id}")
async def deactivate_sector(
    sector_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_manager_or_admin),
):
    result = await db.execute(select(Sector).where(Sector.id == sector_id))
    sector = result.scalar_one_or_none()
    if not sector:
        raise HTTPException(status_code=404, detail="Setor nao encontrado")
    sector.is_active = False
    await record_audit_log(
        db,
        action="sector.deactivated",
        entity_type="sector",
        entity_id=sector.id,
        actor=current_user,
    )
    return {"ok": True}
