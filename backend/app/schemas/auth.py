from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from app.models.access_request import AccessRequestStatus


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


class ResetPasswordResponse(BaseModel):
    ok: bool = True
    reset_url: Optional[str] = None
    message: str


class AccessRequestCreate(BaseModel):
    name: str
    email: EmailStr
    company: Optional[str] = None
    phone: Optional[str] = None
    message: Optional[str] = None


class AccessRequestOut(BaseModel):
    id: str
    name: str
    email: str
    company: Optional[str] = None
    phone: Optional[str] = None
    message: Optional[str] = None
    status: AccessRequestStatus
    created_at: datetime

    model_config = {"from_attributes": True}


class AccessRequestStatusUpdate(BaseModel):
    status: AccessRequestStatus
