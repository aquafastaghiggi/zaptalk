from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.db.database import get_db
from app.models.user import User
from app.schemas.contact import ContactCRMOut, ContactCRMUpdate
from app.services.contact_service import get_contact_crm, update_contact_crm

router = APIRouter(prefix="/contacts", tags=["contacts"])


@router.get("/{contact_id}/crm", response_model=ContactCRMOut)
async def get_contact_crm_view(
    contact_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    data = await get_contact_crm(db, contact_id)
    return data["contact"]


@router.patch("/{contact_id}/crm")
async def update_contact_crm_view(
    contact_id: str,
    body: ContactCRMUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    payload = body.model_dump(exclude_unset=True)
    data = await update_contact_crm(db, contact_id, payload, actor=current_user)
    return data


@router.get("/{contact_id}/crm/details")
async def get_contact_crm_details(
    contact_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await get_contact_crm(db, contact_id)
