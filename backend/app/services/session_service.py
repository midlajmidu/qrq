"""
app/services/session_service.py
Session management business logic.
"""
import logging
import uuid
from datetime import date

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.session import Session
from app.models.queue import Queue
from app.schemas.session import SessionCreate

logger = logging.getLogger(__name__)


async def create_session(
    db: AsyncSession,
    *,
    org_id: uuid.UUID,
    data: SessionCreate,
) -> Session:
    """Create a new session for the given org and date."""
    session = Session(
        org_id=org_id,
        session_date=data.session_date,
        title=data.title or "",
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    logger.info("Session created | id=%s org=%s date=%s", session.id, org_id, data.session_date)
    return session


async def list_sessions(
    db: AsyncSession,
    *,
    org_id: uuid.UUID,
) -> list[dict]:
    """List all sessions for an org, including queue counts."""
    # Subquery to count queues per session
    queue_count_sq = (
        select(
            Queue.session_id,
            func.count(Queue.id).label("queue_count"),
        )
        .where(Queue.org_id == org_id)
        .group_by(Queue.session_id)
        .subquery()
    )

    result = await db.execute(
        select(
            Session,
            func.coalesce(queue_count_sq.c.queue_count, 0).label("queue_count"),
        )
        .outerjoin(queue_count_sq, Session.id == queue_count_sq.c.session_id)
        .where(Session.org_id == org_id)
        .order_by(Session.session_date.desc())
    )

    rows = result.all()
    return [
        {
            "id": row.Session.id,
            "org_id": row.Session.org_id,
            "session_date": row.Session.session_date,
            "title": row.Session.title,
            "created_at": row.Session.created_at,
            "queue_count": row.queue_count,
        }
        for row in rows
    ]


async def get_session_or_404(
    db: AsyncSession,
    *,
    session_id: uuid.UUID,
    org_id: uuid.UUID,
) -> Session:
    """Fetch a session by ID, scoped to org_id."""
    result = await db.execute(
        select(Session).where(
            Session.id == session_id,
            Session.org_id == org_id,
        )
    )
    session = result.scalar_one_or_none()
    if session is None:
        raise ValueError(f"Session {session_id} not found")
    return session


async def delete_session(
    db: AsyncSession,
    *,
    session_id: uuid.UUID,
    org_id: uuid.UUID,
) -> None:
    """Delete a session and all its queues (cascade)."""
    session = await get_session_or_404(db, session_id=session_id, org_id=org_id)
    await db.delete(session)
    await db.commit()
    logger.info("Session deleted | id=%s org=%s", session_id, org_id)
