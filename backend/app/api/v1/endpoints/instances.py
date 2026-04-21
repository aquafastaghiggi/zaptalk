from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from app.core.deps import require_admin
from app.db.database import get_db
from app.services.audit_service import record_audit_log
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User
from app.services.evolution_service import EvolutionService

router = APIRouter(prefix="/instances", tags=["instances"])


class CreateInstanceRequest(BaseModel):
    name: str = Field(
        min_length=3,
        max_length=30,
        pattern=r"^[a-z][a-z0-9_]*$",
        description="Nome da instância em lowercase, começando com letra.",
    )


@router.get("")
async def list_instances(_: User = Depends(require_admin)):
    svc = EvolutionService()
    return await svc.list_instances()


@router.post("", status_code=201)
async def create_instance(
    body: CreateInstanceRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    svc = EvolutionService()
    result = await svc.create_instance(body.name)
    await record_audit_log(
        db,
        action="instance.created",
        entity_type="instance",
        entity_id=body.name,
        actor=current_user,
        details=result if isinstance(result, dict) else {"name": body.name},
    )
    return result


@router.get("/{instance_name}/qrcode")
async def get_qrcode(
    instance_name: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    svc = EvolutionService()
    result = await svc.get_qrcode(instance_name)
    await record_audit_log(
        db,
        action="instance.connect_requested",
        entity_type="instance",
        entity_id=instance_name,
        actor=current_user,
    )
    return result


@router.get("/{instance_name}/status")
async def get_status(instance_name: str, _: User = Depends(require_admin)):
    svc = EvolutionService()
    return await svc.get_instance_status(instance_name)


@router.delete("/{instance_name}/logout")
async def logout(
    instance_name: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    svc = EvolutionService()
    result = await svc.logout_instance(instance_name)
    await record_audit_log(
        db,
        action="instance.logged_out",
        entity_type="instance",
        entity_id=instance_name,
        actor=current_user,
        details=result if isinstance(result, dict) else {"name": instance_name},
    )
    return result


@router.put("/{instance_name}/restart")
async def restart(
    instance_name: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    svc = EvolutionService()
    result = await svc.restart_instance(instance_name)
    await record_audit_log(
        db,
        action="instance.restarted",
        entity_type="instance",
        entity_id=instance_name,
        actor=current_user,
        details=result if isinstance(result, dict) else {"name": instance_name},
    )
    return result


@router.delete("/{instance_name}")
async def delete_instance(
    instance_name: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    svc = EvolutionService()
    result = await svc.delete_instance(instance_name)
    await record_audit_log(
        db,
        action="instance.deleted",
        entity_type="instance",
        entity_id=instance_name,
        actor=current_user,
        details=result if isinstance(result, dict) else {"name": instance_name},
    )
    return result
