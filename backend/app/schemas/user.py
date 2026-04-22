from pydantic import BaseModel, EmailStr
from typing import Optional
from app.models.user import UserRole


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserPublic(BaseModel):
    id: str
    name: str
    email: str
    role: UserRole
    is_active: bool
    is_online: bool
    sector_id: Optional[str] = None
    must_change_password: bool = False
    setup_done: bool = False
    first_login: bool = False

    model_config = {"from_attributes": True}


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: Optional[str] = None
    role: UserRole = UserRole.AGENT
    sector_id: Optional[str] = None


class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    sector_id: Optional[str] = None
    is_active: Optional[bool] = None
    role: Optional[UserRole] = None
    password: Optional[str] = None
    must_change_password: Optional[bool] = None
    setup_done: Optional[bool] = None
    first_login: Optional[bool] = None


class UserPasswordReset(BaseModel):
    password: str


class UserOut(UserPublic):
    pass


class UserCreatedResponse(BaseModel):
    user: UserPublic
    temp_password: str
