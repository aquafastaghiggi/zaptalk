from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.db.database import get_db
from app.core.deps import require_admin, require_manager_or_admin
from app.core.security import get_password_hash
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate, UserOut, UserPasswordReset
from app.services.audit_service import record_audit_log
from app.services.auth_service import create_user

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=List[UserOut])
async def list_users(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_manager_or_admin),
):
    result = await db.execute(select(User).order_by(User.name))
    return result.scalars().all()


@router.post("", response_model=UserOut, status_code=201)
async def create(
    body: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    user = await create_user(db, body)
    await record_audit_log(
        db,
        action="user.created",
        entity_type="user",
        entity_id=user.id,
        actor=current_user,
        details={
            "name": user.name,
            "email": user.email,
            "role": user.role.value,
            "sector_id": user.sector_id,
        },
    )
    return user


@router.patch("/{user_id}", response_model=UserOut)
async def update_user(
    user_id: str,
    body: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario nao encontrado")

    data = body.model_dump(exclude_unset=True)
    password = data.pop("password", None)
    email = data.get("email")

    if email:
        result = await db.execute(select(User).where(User.email == email, User.id != user_id))
        if result.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="E-mail ja cadastrado")

    for field, value in data.items():
        setattr(user, field, value)

    if password:
        user.hashed_password = get_password_hash(password)

    await db.flush()
    await record_audit_log(
        db,
        action="user.updated",
        entity_type="user",
        entity_id=user.id,
        actor=current_user,
        details={
            "fields": list(data.keys()),
            "is_active": user.is_active,
            "role": user.role.value,
            "sector_id": user.sector_id,
        },
    )
    return user


@router.post("/{user_id}/reset-password")
async def reset_password(
    user_id: str,
    body: UserPasswordReset,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario nao encontrado")

    user.hashed_password = get_password_hash(body.password)
    await db.flush()
    await record_audit_log(
        db,
        action="user.password_reset",
        entity_type="user",
        entity_id=user.id,
        actor=current_user,
    )
    return {"ok": True}


@router.delete("/{user_id}")
async def delete_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current: User = Depends(require_admin),
):
    if user_id == current.id:
        raise HTTPException(status_code=400, detail="Nao e possivel remover seu proprio usuario")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario nao encontrado")

    user.is_active = False
    await record_audit_log(
        db,
        action="user.deactivated",
        entity_type="user",
        entity_id=user.id,
        actor=current,
    )
    return {"ok": True}
