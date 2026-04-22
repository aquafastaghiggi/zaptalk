from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status
import secrets
import string
from app.models.user import User
from app.core.security import verify_password, create_access_token, get_password_hash
from app.schemas.user import LoginRequest, UserCreate


def generate_temp_password(length: int = 12) -> str:
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))


async def authenticate_user(db: AsyncSession, data: LoginRequest) -> str:
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="E-mail ou senha incorretos",
        )
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Usuário inativo")

    token = create_access_token({"sub": user.id, "role": user.role})
    return token


async def create_user(db: AsyncSession, data: UserCreate) -> tuple[User, str]:
    result = await db.execute(select(User).where(User.email == data.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="E-mail já cadastrado")

    temp_password = data.password or generate_temp_password()

    user = User(
        name=data.name,
        email=data.email,
        hashed_password=get_password_hash(temp_password),
        role=data.role,
        sector_id=data.sector_id,
        must_change_password=True,
        setup_done=False,
        first_login=True,
    )
    db.add(user)
    await db.flush()
    return user, temp_password
