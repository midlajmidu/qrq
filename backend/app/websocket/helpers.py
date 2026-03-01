"""
app/websocket/helpers.py
Queue state snapshot builder — sent on connect and after every update.

Provides a single function to build the full queue state that prevents
UI desync on reconnection.
"""
import logging
import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.queue import Queue
from app.models.token import Token, TokenStatus

logger = logging.getLogger(__name__)


async def build_queue_snapshot(
    db: AsyncSession,
    *,
    queue_id: uuid.UUID,
) -> dict:
    """
    Build a complete queue state snapshot for WebSocket clients.

    Sent:
      - On initial WebSocket connect (prevents desync)
      - After every queue state change (via Redis publish)

    Returns dict with:
      type, queue_id, queue_name, prefix, current_serving,
      waiting_count, last_called, recent_tokens
    """
    # ── Queue metadata ─────────────────────────────────────────────
    q_result = await db.execute(select(Queue).where(Queue.id == queue_id))
    queue = q_result.scalar_one_or_none()
    if queue is None:
        return {"type": "error", "message": "Queue not found"}

    # ── Currently serving ──────────────────────────────────────────
    serving_result = await db.execute(
        select(Token.token_number)
        .where(
            Token.queue_id == queue_id,
            Token.status == TokenStatus.serving,
        )
        .order_by(Token.token_number.desc())
        .limit(1)
    )
    current_serving = serving_result.scalar_one_or_none() or 0

    # ── Waiting count ──────────────────────────────────────────────
    waiting_result = await db.execute(
        select(func.count())
        .select_from(Token)
        .where(
            Token.queue_id == queue_id,
            Token.status == TokenStatus.waiting,
        )
    )
    waiting_count = waiting_result.scalar_one()

    # ── Recent tokens (last 5 served/serving/skipped/deleted for display) ───
    recent_result = await db.execute(
        select(Token)
        .where(
            Token.queue_id == queue_id,
            Token.status.in_([TokenStatus.serving, TokenStatus.done, TokenStatus.skipped, TokenStatus.deleted]),
        )
        .order_by(Token.token_number.desc())
        .limit(5)
    )
    recent_tokens = [
        {
            "token_number": t.token_number,
            "status": t.status.value,
            "served_at": t.served_at.isoformat() if t.served_at else None,
        }
        for t in recent_result.scalars().all()
    ]

    # ── Waiting tokens (all of them, or limit 50 for large queues) ──
    waiting_tokens_result = await db.execute(
        select(Token)
        .where(
            Token.queue_id == queue_id,
            Token.status == TokenStatus.waiting,
        )
        .order_by(Token.token_number.asc())
        .limit(50)
    )
    waiting_tokens = [
        {
            "id": str(t.id),
            "token_number": t.token_number,
            "status": t.status.value,
        }
        for t in waiting_tokens_result.scalars().all()
    ]

    return {
        "type": "queue_snapshot",
        "queue_id": str(queue_id),
        "queue_name": queue.name,
        "prefix": queue.prefix,
        "is_active": queue.is_active,
        "current_serving": current_serving,
        "waiting_count": waiting_count,
        "last_called": current_serving,
        "total_issued": queue.current_token_number,
        "recent_tokens": recent_tokens,
        "waiting_tokens": waiting_tokens,
    }
