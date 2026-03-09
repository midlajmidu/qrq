"""
app/schemas/session.py
Pydantic schemas for Session management.
"""
import uuid
from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, Field


class SessionCreate(BaseModel):
    session_date: date
    title: Optional[str] = Field(default="", max_length=200)


class SessionResponse(BaseModel):
    id: uuid.UUID
    org_id: uuid.UUID
    session_date: date
    title: Optional[str] = ""
    created_at: datetime
    queue_count: int = 0

    model_config = {"from_attributes": True}
