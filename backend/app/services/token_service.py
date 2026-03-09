"""
app/services/token_service.py
Token engine — the concurrency-critical core of the system.

KEY DESIGN: Every mutating operation uses SELECT FOR UPDATE on the queue row.
This serialises concurrent requests at the database level, guaranteeing:
  - No duplicate token numbers
  - No double-serving
  - No skipped positions under parallel load

PHASE 4+ REFACTOR: Transactions are now managed by the FastAPI dependency (get_db).
This service performs the mutations and flushes. 
Real-time updates are triggered by callers (usually via BackgroundTasks) 
to ensure updates are published ONLY after successful commit.
"""
import logging
import uuid
from datetime import datetime, timezone

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.queue import Queue
from app.models.token import Token, TokenStatus
from app.schemas.queue import JoinResponse, NextResponse, JoinRequest
from app.websocket.connection_manager import manager as ws_manager
from app.websocket.pubsub import publish_queue_update
from app.websocket.helpers import build_queue_snapshot
from app.db.session import AsyncSessionLocal

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Internal helpers
# ─────────────────────────────────────────────────────────────────────────────

async def _lock_queue(db: AsyncSession, queue_id: uuid.UUID) -> Queue:
    """
    Fetch the queue row with a row-level EXCLUSIVE lock (SELECT FOR UPDATE).
    """
    result = await db.execute(
        select(Queue)
        .where(Queue.id == queue_id)
        .with_for_update()
    )
    queue = result.scalar_one_or_none()
    if queue is None:
        raise ValueError("Queue not found")
    return queue


async def _count_waiting_ahead(
    db: AsyncSession,
    *,
    queue_id: uuid.UUID,
    token_number: int,
) -> int:
    result = await db.execute(
        select(func.count())
        .select_from(Token)
        .where(
            Token.queue_id == queue_id,
            Token.status == TokenStatus.waiting,
            Token.token_number < token_number,
        )
    )
    return result.scalar_one()


async def _current_serving_number(
    db: AsyncSession,
    *,
    queue_id: uuid.UUID,
) -> int:
    result = await db.execute(
        select(Token.token_number)
        .where(
            Token.queue_id == queue_id,
            Token.status == TokenStatus.serving,
        )
        .order_by(Token.token_number.desc())
        .limit(1)
    )
    val = result.scalar_one_or_none()
    return val if val is not None else 0


async def _count_waiting(db: AsyncSession, *, queue_id: uuid.UUID) -> int:
    result = await db.execute(
        select(func.count())
        .select_from(Token)
        .where(
            Token.queue_id == queue_id,
            Token.status == TokenStatus.waiting,
        )
    )
    return result.scalar_one()


async def notify_queue_update(queue_id: uuid.UUID, org_id: uuid.UUID) -> None:
    """
    Build a fresh snapshot and publish it to Redis.
    Designed to be run as a BackgroundTask (post-commit).
    """
    try:
        from app.redis.client import get_redis
        redis = get_redis()
        channel = ws_manager.get_channel(str(org_id), str(queue_id))

        # Build a fresh snapshot from a NEW session (to see committed data)
        async with AsyncSessionLocal() as snapshot_db:
            snapshot = await build_queue_snapshot(snapshot_db, queue_id=queue_id)

        snapshot["type"] = "queue_update"
        await publish_queue_update(redis, channel=channel, payload=snapshot)
    except Exception as exc:
        logger.error("Failed to publish background queue update: %s", exc)


# ─────────────────────────────────────────────────────────────────────────────
# Public API — Join
# ─────────────────────────────────────────────────────────────────────────────

async def join_queue(
    db: AsyncSession,
    *,
    queue_id: uuid.UUID,
    data: JoinRequest,
) -> JoinResponse:
    """
    Atomically assign the next token number.
    Stores customer name/age/phone on the token row.
    Caller must handle commit and background notification.
    """
    queue = await _lock_queue(db, queue_id)

    if not queue.is_active:
        raise ValueError("Queue is not accepting customers")

    queue.current_token_number += 1
    new_number = queue.current_token_number

    token = Token(
        org_id=queue.org_id,
        queue_id=queue.id,
        session_id=queue.token_session_id,  # ← inherit current token session
        token_number=new_number,
        status=TokenStatus.waiting,
        customer_name=data.name.strip(),
        customer_age=data.age,
        customer_phone=data.phone.strip(),
    )
    db.add(token)
    await db.flush()

    # Position calculation
    position = await _count_waiting_ahead(db, queue_id=queue_id, token_number=new_number)
    current_serving = await _current_serving_number(db, queue_id=queue_id)

    return JoinResponse(
        id=token.id,
        token_number=new_number,
        position=position,
        current_serving=current_serving,
        queue_prefix=queue.prefix,
        session_id=queue.token_session_id,
    )


# ─────────────────────────────────────────────────────────────────────────────
# Public API — Next (admin)
# ─────────────────────────────────────────────────────────────────────────────

async def call_next(
    db: AsyncSession,
    *,
    queue_id: uuid.UUID,
    org_id: uuid.UUID,
    action: str = "done",  # "done", "skipped", or "deleted"
) -> NextResponse | None:
    now = datetime.now(timezone.utc)

    queue = await _lock_queue(db, queue_id)
    if queue.org_id != org_id:
        raise PermissionError("Access denied")
    if not queue.is_active:
        raise ValueError("Queue is not active")

    if action not in ("done", "skipped", "deleted"):
        raise ValueError("Invalid action")

    if action == "done":
        target_status = TokenStatus.done
    elif action == "deleted":
        target_status = TokenStatus.deleted
    else:
        target_status = TokenStatus.skipped

    # Mark currently-serving token
    await db.execute(
        update(Token)
        .where(
            Token.queue_id == queue_id,
            Token.status == TokenStatus.serving,
        )
        .values(status=target_status, completed_at=now)
    )

    # Find next waiting token
    next_result = await db.execute(
        select(Token)
        .where(
            Token.queue_id == queue_id,
            Token.status == TokenStatus.waiting,
        )
        .order_by(Token.token_number.asc())
        .limit(1)
        .with_for_update(skip_locked=False)
    )
    next_token = next_result.scalar_one_or_none()

    if next_token:
        next_token.status = TokenStatus.serving
        next_token.served_at = now
    
    await db.flush()

    if next_token is None:
        return None

    remaining = await _count_waiting(db, queue_id=queue_id)
    return NextResponse(
        serving=next_token.token_number,
        remaining=remaining,
    )


# ─────────────────────────────────────────────────────────────────────────────
# Public API — Skip / Done
# ─────────────────────────────────────────────────────────────────────────────

async def _get_token_for_org(db: AsyncSession, token_id: uuid.UUID, org_id: uuid.UUID) -> Token:
    result = await db.execute(
        select(Token).where(Token.id == token_id, Token.org_id == org_id)
    )
    token = result.scalar_one_or_none()
    if token is None:
        raise ValueError("Token not found")
    return token


async def skip_token(db: AsyncSession, *, token_id: uuid.UUID, org_id: uuid.UUID) -> Token:
    token = await _get_token_for_org(db, token_id=token_id, org_id=org_id)
    if token.status != TokenStatus.waiting:
        raise ValueError(f"Cannot skip token with status '{token.status}'")

    token.status = TokenStatus.skipped
    token.completed_at = datetime.now(timezone.utc)
    await db.flush()
    return token


async def complete_token(db: AsyncSession, *, token_id: uuid.UUID, org_id: uuid.UUID) -> Token:
    token = await _get_token_for_org(db, token_id=token_id, org_id=org_id)
    if token.status != TokenStatus.serving:
        raise ValueError(f"Cannot complete token with status '{token.status}'")

    token.status = TokenStatus.done
    token.served_at = token.served_at or datetime.now(timezone.utc)
    token.completed_at = datetime.now(timezone.utc)
    await db.flush()
    return token


async def remove_token(db: AsyncSession, *, token_id: uuid.UUID, org_id: uuid.UUID) -> Token:
    token = await _get_token_for_org(db, token_id=token_id, org_id=org_id)
    queue = await _lock_queue(db, token.queue_id)
    
    if token.status == TokenStatus.waiting:
        token.status = TokenStatus.deleted
        token.completed_at = datetime.now(timezone.utc)
        await db.flush()
    elif token.status == TokenStatus.serving:
        await call_next(db, queue_id=queue.id, org_id=org_id, action="deleted")
        await db.refresh(token)
    else:
        raise ValueError("Cannot remove completed or already skipped/deleted token")
    return token


async def serve_specific_token(db: AsyncSession, *, queue_id: uuid.UUID, org_id: uuid.UUID, token_number: int) -> NextResponse:
    now = datetime.now(timezone.utc)
    queue = await _lock_queue(db, queue_id)
    
    if queue.org_id != org_id:
        raise PermissionError("Access denied")
    if not queue.is_active:
        raise ValueError("Queue is not active")

    # Find the specific token
    specific_result = await db.execute(
        select(Token)
        .where(
            Token.queue_id == queue_id,
            Token.token_number == token_number,
        )
        .with_for_update(skip_locked=False)
    )
    specific_token = specific_result.scalar_one_or_none()

    if not specific_token:
        raise ValueError("Token not found")
    if specific_token.status != TokenStatus.waiting:
        raise ValueError("Token is not waiting")

    # Mark currently-serving token as skipped
    await db.execute(
        update(Token)
        .where(
            Token.queue_id == queue_id,
            Token.status == TokenStatus.serving,
        )
        .values(status=TokenStatus.skipped, completed_at=now)
    )

    specific_token.status = TokenStatus.serving
    specific_token.served_at = now
    
    await db.flush()

    remaining = await _count_waiting(db, queue_id=queue_id)
    return NextResponse(
        serving=specific_token.token_number,
        remaining=remaining,
    )
async def list_queue_tokens(db: AsyncSession, *, queue_id: uuid.UUID, org_id: uuid.UUID) -> list[Token]:
    """Retrieve all tokens in a queue (history/details view)."""
    result = await db.execute(
        select(Token)
        .where(Token.queue_id == queue_id, Token.org_id == org_id)
        .order_by(Token.token_number.asc())
    )
    return list(result.scalars().all())
