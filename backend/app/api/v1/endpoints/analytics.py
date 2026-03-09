"""
app/api/v1/endpoints/analytics.py
Analytics and dashboard overview endpoints.
"""
from typing import Optional
import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_active_user
from app.db.deps import get_db
from app.models.user import User
from app.services.analytics_service import get_overview_metrics

router = APIRouter()

@router.get("/overview", summary="Get Overview Metrics")
async def get_overview(
    session_id: Optional[uuid.UUID] = Query(None, description="Filter by Session ID"),
    queue_id: Optional[uuid.UUID] = Query(None, description="Filter by Queue ID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> dict:
    """Fetch dashboard metrics (total visits, times, charts) filtered by org and optionally session/queue."""
    return await get_overview_metrics(
        db,
        org_id=current_user.org_id,
        session_id=session_id,
        queue_id=queue_id,
    )
