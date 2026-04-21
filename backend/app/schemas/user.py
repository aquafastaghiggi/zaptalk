from pydantic import BaseModel, EmailStr
from typing import Optional
from app.models.user import UserRole


# ── Auth ──────────────────────────────────────
class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ── User ──────────────────────────────────────
class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: UserRole = UserRole.AGENT
    sector_id: Optional[str] = None


class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    sector_id: Optional[str] = None
    is_active: Optional[bool] = None
    role: Optional[UserRole] = None
    password: Optional[str] = None


class UserPasswordReset(BaseModel):
    password: str


class UserOut(BaseModel):
    id: str
    name: str
    email: str
    role: UserRole
    is_active: bool
    is_online: bool
    sector_id: Optional[str] = None

    model_config = {"from_attributes": True}
