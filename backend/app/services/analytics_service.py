"""
app/services/analytics_service.py
Service for fetching overview statistics and graphs.
"""
import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.token import Token, TokenStatus
from app.models.session import Session

async def get_overview_metrics(
    db: AsyncSession,
    *,
    org_id: uuid.UUID,
    session_id: Optional[uuid.UUID] = None,
    queue_id: Optional[uuid.UUID] = None,
) -> dict:
    """Fetch aggregated metrics for the dashboard."""
    
    # Base conditions
    conditions = [Token.org_id == org_id]
    if session_id:
        conditions.append(Token.session_id == session_id)
    if queue_id:
        conditions.append(Token.queue_id == queue_id)

    # Filter out deleted tokens from most metrics
    active_conditions = conditions.copy()
    from app.models.token import TokenStatus
    active_conditions.append(Token.status != TokenStatus.deleted)

    # 1. Status Counts
    count_query = select(Token.status, func.count(Token.id)).where(and_(*conditions)).group_by(Token.status)
    count_result = await db.execute(count_query)
    
    counts = {s.value: 0 for s in TokenStatus}
    for row in count_result.all():
        counts[row[0].value] = row[1]
        
    # Total visits should NOT include deleted tokens
    total_visits = counts[TokenStatus.waiting.value] + counts[TokenStatus.serving.value] + \
                   counts[TokenStatus.done.value] + counts[TokenStatus.skipped.value]
    
    served_visits = counts[TokenStatus.done.value]
    cancelled_visits = counts[TokenStatus.skipped.value] + counts[TokenStatus.deleted.value]
    waiting_visits = counts[TokenStatus.waiting.value]

    # 2. Timing Aggregations - Exclude deleted
    timing_query = select(
        func.avg(func.extract('epoch', Token.served_at - Token.created_at)).label('avg_wait_sec'),
        func.max(func.extract('epoch', Token.served_at - Token.created_at)).label('max_wait_sec'),
        func.avg(func.extract('epoch', Token.completed_at - Token.served_at)).label('avg_serve_sec'),
        func.max(func.extract('epoch', Token.completed_at - Token.served_at)).label('max_serve_sec'),
    ).where(and_(*active_conditions))
    
    timing_res = await db.execute(timing_query)
    row = timing_res.first()
    
    def format_time(seconds: float | None) -> str:
        if not seconds:
            return "00:00:00"
        m, s = divmod(int(seconds), 60)
        h, m = divmod(m, 60)
        return f"{h:02d}:{m:02d}:{s:02d}"

    # 3. Hourly Chart (Visits by hour) - Exclude deleted
    hourly_query = select(
        func.extract('hour', Token.created_at).label('hr'),
        func.count(Token.id)
    ).where(and_(*active_conditions)).group_by('hr').order_by('hr')
    
    hourly_res = await db.execute(hourly_query)
    hourly_data = [{"hour": f"{int(row[0]):02d}:00", "visits": row[1]} for row in hourly_res.all()]

    # 4. Monthly Chart - Exclude deleted
    from sqlalchemy.sql.expression import true
    monthly_query = select(
        func.extract('month', Token.created_at).label('mon'),
        func.extract('year', Token.created_at).label('yr'),
        func.count(Token.id)
    ).where(and_(Token.org_id == org_id, Token.status != TokenStatus.deleted)).group_by('yr', 'mon').order_by('yr', 'mon')
    
    monthly_res = await db.execute(monthly_query)
    months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    monthly_data = [{"month": f"{months[int(row[0])-1]} {int(row[1])}", "visits": row[2]} for row in monthly_res.all()]

    # 5. Recent Activity (for show last details request)
    from app.models.queue import Queue
    recent_query = select(
        Token.token_number,
        Token.status,
        Token.created_at,
        Queue.name.label('queue_name')
    ).join(Queue, Token.queue_id == Queue.id).where(
        and_(*active_conditions)
    ).order_by(Token.created_at.desc()).limit(5)
    
    recent_res = await db.execute(recent_query)
    recent_activity = [
        {
            "number": r.token_number,
            "status": r.status.value,
            "queue": r.queue_name,
            "time": r.created_at.isoformat()
        }
        for r in recent_res.all()
    ]

    return {
        "status_counts": {
            "total": total_visits,
            "served": served_visits,
            "cancelled": cancelled_visits,
            "waiting": waiting_visits,
        },
        "timings": {
            "avg_waiting_time": format_time(row.avg_wait_sec),
            "max_waiting_time": format_time(row.max_wait_sec),
            "avg_served_time": format_time(row.avg_serve_sec),
            "max_served_time": format_time(row.max_serve_sec),
        },
        "charts": {
            "hourly": hourly_data,
            "monthly": monthly_data,
        },
        "recent_activity": recent_activity
    }
