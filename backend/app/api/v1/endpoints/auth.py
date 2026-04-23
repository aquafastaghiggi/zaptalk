from datetime import datetime, timedelta, timezone
import secrets

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, require_admin
from app.core.config import settings
from app.core.security import get_password_hash, verify_password
from app.db.database import get_db
from app.models.access_request import AccessRequest, AccessRequestStatus
from app.models.invite_token import InviteToken
from app.models.password_reset_token import PasswordResetToken
from app.models.user import User, UserRole
from app.schemas.auth import (
    AccessRequestCreate,
    AccessRequestOut,
    AccessRequestStatusUpdate,
    ForgotPasswordRequest,
    InvitationAcceptRequest,
    InvitationPreviewOut,
    ResetPasswordRequest,
    ResetPasswordResponse,
)
from app.schemas.user import LoginRequest, TokenResponse, UserCreate, UserCreatedResponse, UserOut, UserInvitationCreate, UserInvitationOut
from app.services.auth_service import authenticate_user, create_user, generate_temp_password
from app.services.email_service import send_password_reset_email

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


@public_router.post("/signup", response_model=UserCreatedResponse, status_code=201)
async def public_signup(data: UserCreate, db: AsyncSession = Depends(get_db)):
    if not settings.PUBLIC_SIGNUP_ENABLED:
        raise HTTPException(status_code=403, detail="Cadastro público desativado")

    data.role = UserRole.AGENT
    user, temp_password = await create_user(db, data)
    return UserCreatedResponse(user=user, temp_password=temp_password)


@public_router.get("/invitation/{token}", response_model=InvitationPreviewOut)
async def preview_invitation(token: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(InviteToken).where(InviteToken.token == token))
    invitation = result.scalar_one_or_none()
    if not invitation:
        raise HTTPException(status_code=404, detail="Convite nao encontrado")
    if invitation.accepted_at is not None:
        raise HTTPException(status_code=400, detail="Convite ja utilizado")
    if invitation.expires_at <= datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Convite expirado")

    user_result = await db.execute(select(User).where(User.id == invitation.user_id))
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario do convite nao encontrado")

    return InvitationPreviewOut(
        name=user.name,
        email=invitation.email,
        expires_at=invitation.expires_at,
        is_valid=True,
    )


@public_router.post("/invitation/accept")
async def accept_invitation(body: InvitationAcceptRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(InviteToken).where(InviteToken.token == body.token))
    invitation = result.scalar_one_or_none()
    if not invitation:
        raise HTTPException(status_code=404, detail="Convite nao encontrado")
    if invitation.accepted_at is not None:
        raise HTTPException(status_code=400, detail="Convite ja utilizado")
    if invitation.expires_at <= datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Convite expirado")

    user_result = await db.execute(select(User).where(User.id == invitation.user_id))
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario nao encontrado")

    user.hashed_password = get_password_hash(body.password)
    user.is_active = True
    user.must_change_password = False
    user.first_login = False
    invitation.accepted_at = datetime.now(timezone.utc)
    await db.flush()
    return {
        "ok": True,
        "message": "Cadastro confirmado com sucesso.",
        "redirect_url": "/signup-confirmed?source=invite",
    }


@router.post("/forgot-password", response_model=ResetPasswordResponse)
async def forgot_password(body: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        return ResetPasswordResponse(message="Se o e-mail existir, enviaremos o link de redefinicao.")

    token = secrets.token_urlsafe(32)
    reset_token = PasswordResetToken(
        user_id=user.id,
        email=user.email,
        token=token,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=2),
    )
    db.add(reset_token)
    await db.flush()
    email_sent, _delivery_message = send_password_reset_email(
        name=user.name,
        email=user.email,
        reset_token=token,
        expires_at=reset_token.expires_at,
    )
    return ResetPasswordResponse(
        message=("Link enviado por e-mail com sucesso." if email_sent else "Link de redefinicao gerado com sucesso."),
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
