from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.schemas.user import LoginRequest, TokenResponse, UserCreate, UserOut
from app.services.auth_service import authenticate_user, create_user
from app.core.deps import get_current_user
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    token = await authenticate_user(db, data)
    return TokenResponse(access_token=token)


@router.post("/register", response_model=UserOut, status_code=201)
async def register(data: UserCreate, db: AsyncSession = Depends(get_db)):
    """Registro inicial (desabilitar em produção ou proteger com admin)."""
    user = await create_user(db, data)
    return user


@router.get("/me", response_model=UserOut)
async def me(current_user: User = Depends(get_current_user)):
    return current_user
