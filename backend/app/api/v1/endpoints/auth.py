from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.db.database import get_db
from app.schemas.user import (
    LoginRequest,
    TokenResponse,
    UserCreate,
    UserCreatedResponse,
    UserOut,
)
from app.services.auth_service import authenticate_user, create_user
from app.core.deps import get_current_user, require_admin
from app.core.security import get_password_hash, verify_password
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    token = await authenticate_user(db, data)
    return TokenResponse(access_token=token)


@router.post("/register", response_model=UserCreatedResponse, status_code=201)
async def register(
    data: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Registro protegido para administradores."""
    user, temp_password = await create_user(db, data)
    return UserCreatedResponse(user=user, temp_password=temp_password)


@router.get("/me", response_model=UserOut)
async def me(current_user: User = Depends(get_current_user)):
    return current_user


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


@router.patch("/change-password")
async def change_password(
    body: ChangePasswordRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(body.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Senha atual incorreta")
    if body.new_password == body.current_password:
        raise HTTPException(status_code=400, detail="Nova senha deve ser diferente da atual")

    current_user.hashed_password = get_password_hash(body.new_password)
    current_user.must_change_password = False
    await db.flush()
    return {"ok": True}


@router.patch("/setup-done")
async def mark_setup_done(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    current_user.setup_done = True
    await db.flush()
    return {"ok": True}


@router.patch("/first-login-done")
async def mark_first_login_done(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    current_user.first_login = False
    await db.flush()
    return {"ok": True}
