from __future__ import annotations

from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.schemas.user import UserOut


class ContactCRMUpdate(BaseModel):
    name: Optional[str] = None
    company: Optional[str] = None
    origin: Optional[str] = None
    stage: Optional[str] = None
    notes: Optional[str] = None
    responsible_user_id: Optional[str] = None


class ContactCRMOut(BaseModel):
    id: str
    phone: str
    name: Optional[str] = None
    profile_picture: Optional[str] = None
    company: Optional[str] = None
    origin: Optional[str] = None
    stage: Optional[str] = None
    notes: Optional[str] = None
    responsible_user_id: Optional[str] = None
    responsible_user: Optional[UserOut] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
