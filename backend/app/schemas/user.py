"""
app/schemas/user.py
Pydantic schemas for user responses.
password_hash is DELIBERATELY excluded from all response schemas.
"""
import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr


class UserResponse(BaseModel):
    """Safe public representation of a user — no password_hash."""

    id: uuid.UUID
    email: EmailStr
    org_id: uuid.UUID
    role: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class OrganizationResponse(BaseModel):
    """Safe public representation of an organization."""

    id: uuid.UUID
    name: str
    slug: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}
