from datetime import datetime, timedelta, timezone
import secrets

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, require_admin
from app.core.security import get_password_hash, verify_password
from app.db.database import get_db
from app.models.access_request import AccessRequest, AccessRequestStatus
from app.models.password_reset_token import PasswordResetToken
from app.models.user import User
from app.schemas.auth import (
    AccessRequestCreate,
    AccessRequestOut,
    AccessRequestStatusUpdate,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    ResetPasswordResponse,
)
from app.schemas.user import LoginRequest, TokenResponse, UserCreate, UserCreatedResponse, UserOut
from app.services.auth_service import authenticate_user, create_user

router = APIRouter(prefix="/auth", tags=["auth"])
public_router = APIRouter(prefix="/public", tags=["public"])


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


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
    current_user.first_login = False
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


@router.post("/forgot-password", response_model=ResetPasswordResponse)
async def forgot_password(body: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        return ResetPasswordResponse(message="Se o e-mail existir, enviaremos o link de redefinição.")

    token = secrets.token_urlsafe(32)
    reset_token = PasswordResetToken(
        user_id=user.id,
        email=user.email,
        token=token,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=2),
    )
    db.add(reset_token)
    await db.flush()
    return ResetPasswordResponse(
        message="Link de redefinição gerado com sucesso.",
        reset_url=f"/reset-password/{token}",
    )


@router.post("/reset-password")
async def reset_password(body: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(PasswordResetToken).where(PasswordResetToken.token == body.token))
    token = result.scalar_one_or_none()
    if not token:
        raise HTTPException(status_code=404, detail="Token de redefinição não encontrado")
    if token.used_at is not None:
        raise HTTPException(status_code=400, detail="Token já utilizado")
    if token.expires_at <= datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Token expirado")

    user_result = await db.execute(select(User).where(User.id == token.user_id))
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    user.hashed_password = get_password_hash(body.new_password)
    user.must_change_password = False
    user.first_login = False
    token.used_at = datetime.now(timezone.utc)
    await db.flush()
    return {"ok": True}


@public_router.post("/access-requests", response_model=AccessRequestOut, status_code=201)
async def create_access_request(body: AccessRequestCreate, db: AsyncSession = Depends(get_db)):
    request = AccessRequest(
        name=body.name,
        email=body.email,
        company=body.company,
        phone=body.phone,
        message=body.message,
        status=AccessRequestStatus.NEW,
    )
    db.add(request)
    await db.flush()
    return request


@public_router.get("/access-requests", response_model=list[AccessRequestOut])
async def list_access_requests(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    result = await db.execute(select(AccessRequest).order_by(AccessRequest.created_at.desc()))
    return result.scalars().all()


@public_router.patch("/access-requests/{request_id}", response_model=AccessRequestOut)
async def update_access_request(
    request_id: str,
    body: AccessRequestStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    result = await db.execute(select(AccessRequest).where(AccessRequest.id == request_id))
    request = result.scalar_one_or_none()
    if not request:
        raise HTTPException(status_code=404, detail="Solicitação não encontrada")

    request.status = body.status
    await db.flush()
    return request
