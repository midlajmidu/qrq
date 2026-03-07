"""
app/schemas/queue.py
Pydantic schemas for Queue and Token request/response.
"""
import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, field_validator

from app.models.token import TokenStatus


# ── Queue ─────────────────────────────────────────────────────────────────────

class QueueCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=150)
    prefix: str = Field(default="A", min_length=1, max_length=10)


class QueueResponse(BaseModel):
    id: uuid.UUID
    org_id: uuid.UUID
    name: str
    prefix: str
    current_token_number: int
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Token join ────────────────────────────────────────────────────────────────

class JoinRequest(BaseModel):
    """Customer details required to take a token."""
    name: str = Field(..., min_length=1, max_length=120)
    age: Optional[int] = Field(None, ge=0, le=150)
    phone: str = Field(..., min_length=1, max_length=20)

    @field_validator("name", "phone", mode="before")
    @classmethod
    def strip_whitespace(cls, v: str) -> str:
        return v.strip() if isinstance(v, str) else v


class JoinResponse(BaseModel):
    """Returned when a customer joins a queue."""
    token_number: int
    position: int           # how many 'waiting' tokens are ahead
    current_serving: int    # the token_number currently being served (0 = none)
    queue_prefix: str
    session_id: uuid.UUID


class PublicTokenResponse(BaseModel):
    """Public details for a single token."""
    token_number: int
    status: TokenStatus
    customer_name: str
    customer_age: Optional[int]
    customer_phone: str
    session_id: uuid.UUID

    model_config = {"from_attributes": True}


# ── Admin next ────────────────────────────────────────────────────────────────

class NextResponse(BaseModel):
    """Returned when admin clicks Next."""
    serving: int            # token_number now serving
    remaining: int          # waiting tokens still in queue


class NoTokenResponse(BaseModel):
    message: str = "No tokens waiting"


# ── Token detail ──────────────────────────────────────────────────────────────

class TokenResponse(BaseModel):
    id: uuid.UUID
    org_id: uuid.UUID
    queue_id: uuid.UUID
    token_number: int
    status: TokenStatus
    created_at: datetime
    served_at: Optional[datetime]
    customer_name: str
    customer_age: Optional[int]
    customer_phone: str

    model_config = {"from_attributes": True}
