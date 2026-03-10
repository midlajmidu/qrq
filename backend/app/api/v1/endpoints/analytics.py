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
    recent_limit: int = Query(5, description="Number of recent activities to show"),
    recent_offset: int = Query(0, description="Offset for recent activities"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> dict:
    """Fetch dashboard metrics (total visits, times, charts) filtered by org and optionally session/queue."""
    return await get_overview_metrics(
        db,
        org_id=current_user.org_id,
        session_id=session_id,
        queue_id=queue_id,
        recent_limit=recent_limit,
        recent_offset=recent_offset,
    )

@router.get("/history", summary="Get Detailed History")
async def get_history(
    session_id: Optional[uuid.UUID] = Query(None, description="Filter by Session ID"),
    queue_id: Optional[uuid.UUID] = Query(None, description="Filter by Queue ID"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> dict:
    """Fetch detailed token history with pagination and filters."""
    from app.services.analytics_service import get_history_details
    return await get_history_details(
        db,
        org_id=current_user.org_id,
        session_id=session_id,
        queue_id=queue_id,
        limit=limit,
        offset=offset,
    )
