"""
app/api/v1/endpoints/queues.py
Queue management endpoints (admin protected).

Routes:
  POST   /queues                    → create queue
  GET    /queues                    → list org's queues
  GET    /queues/{queue_id}         → queue detail
  PATCH  /queues/{queue_id}/active  → activate / deactivate
  POST   /queues/{queue_id}/join    → customer joins (public)
  POST   /queues/{queue_id}/next    → admin calls next token
"""
import logging
import uuid
from typing import Union

from fastapi import APIRouter, Depends, HTTPException, Request, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_active_user, get_current_admin_or_staff
from app.db.deps import get_db
from app.models.user import User
from app.schemas.queue import (
    JoinRequest,
    JoinResponse,
    NextResponse,
    NoTokenResponse,
    QueueCreate,
    QueueResponse,
    TokenResponse,
    PublicTokenResponse,
    AnnouncementUpdate,
)
from app.services import queue_service, token_service
from app.middleware.rate_limiter import join_rate_limit, api_rate_limit
from app.audit.service import record_event

logger = logging.getLogger(__name__)
router = APIRouter()


# ── Helpers ───────────────────────────────────────────────────────────────────

def _raise_404(exc: Exception) -> None:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


def _raise_400(exc: Exception) -> None:
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


def _raise_403(exc: Exception) -> None:
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))


# ─────────────────────────────────────────────────────────────────────────────
# Admin — Queue Management
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "",
    response_model=QueueResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Queue",
    dependencies=[Depends(api_rate_limit)],
)
async def create_queue(
    body: QueueCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> QueueResponse:
    """Create a new queue for the authenticated organization."""
    try:
        queue = await queue_service.create_queue(
            db, org_id=current_user.org_id, data=body
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return QueueResponse.model_validate(queue)


@router.get(
    "",
    response_model=list[QueueResponse],
    summary="List Queues",
)
async def list_queues(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> list[QueueResponse]:
    """List all queues for the authenticated organization."""
    queues = await queue_service.list_queues(db, org_id=current_user.org_id)
    return [QueueResponse.model_validate(q) for q in queues]


@router.get(
    "/{queue_id}",
    response_model=QueueResponse,
    summary="Get Queue",
)
async def get_queue(
    queue_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> QueueResponse:
    """Get a specific queue (tenant-scoped)."""
    try:
        queue = await queue_service.get_queue_or_404(
            db, queue_id=queue_id, org_id=current_user.org_id
        )
    except ValueError as exc:
        _raise_404(exc)
    return QueueResponse.model_validate(queue)


@router.get(
    "/{queue_id}/tokens",
    response_model=list[TokenResponse],
    summary="List tokens in a specific queue (Admin History)",
)
async def list_tokens(
    queue_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_or_staff),
):
    """Retrieve all tokens in a queue (history/details view)."""
    # Verify queue exists and belongs to current_user
    await queue_service.get_queue_or_404(db, queue_id=queue_id, org_id=current_user.org_id)
    tokens = await token_service.list_queue_tokens(
        db, queue_id=queue_id, org_id=current_user.org_id
    )
    return [TokenResponse.model_validate(t) for t in tokens]


@router.patch(
    "/{queue_id}/active",
    response_model=QueueResponse,
    summary="Toggle Queue Active State",
)
async def toggle_queue_active(
    queue_id: uuid.UUID,
    is_active: bool,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> QueueResponse:
    """Activate or deactivate a queue."""
    try:
        queue = await queue_service.set_queue_active(
            db, queue_id=queue_id, org_id=current_user.org_id, is_active=is_active
        )
    except ValueError as exc:
        _raise_404(exc)
    return QueueResponse.model_validate(queue)


@router.patch(
    "/{queue_id}/announcement",
    response_model=QueueResponse,
    summary="Update Queue Announcement",
)
async def update_queue_announcement(
    queue_id: uuid.UUID,
    body: AnnouncementUpdate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> QueueResponse:
    """Update the announcement for a queue."""
    try:
        announcement = body.announcement or ""
        queue = await queue_service.set_queue_announcement(
            db, queue_id=queue_id, org_id=current_user.org_id, announcement=announcement
        )
        background_tasks.add_task(
            token_service.notify_queue_update,
            queue_id=queue_id,
            org_id=current_user.org_id
        )
    except ValueError as exc:
        _raise_404(exc)
    return QueueResponse.model_validate(queue)

@router.delete(
    "/{queue_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete Queue",
    description="Deletes a queue and all its associated tokens forever.",
)
async def delete_queue(
    queue_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> None:
    """Delete a specific queue."""
    try:
        await queue_service.delete_queue(db, queue_id=queue_id, org_id=current_user.org_id)
    except ValueError as exc:
        _raise_404(exc)

@router.post(
    "/{queue_id}/reset",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Reset Queue",
    description="Deletes all tokens for a queue and resets token counter to 0.",
)
async def reset_queue(
    queue_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> None:
    """Reset a specific queue."""
    try:
        await queue_service.reset_queue(db, queue_id=queue_id, org_id=current_user.org_id)
        background_tasks.add_task(
            token_service.notify_queue_update,
            queue_id=queue_id,
            org_id=current_user.org_id
        )
    except ValueError as exc:
        _raise_404(exc)


# ─────────────────────────────────────────────────────────────────────────────
# Public — Customer joins queue
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/{queue_id}/tokens",
    response_model=JoinResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Take Token (Public)",
    dependencies=[Depends(join_rate_limit)],
    description=(
        "Public endpoint — no auth required. Customer provides name, age (optional), phone. "
        "Rate limited to 30/min per IP. Atomically assigns the next token number."
    ),
)
async def create_token(
    queue_id: uuid.UUID,
    body: JoinRequest,
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
) -> JoinResponse:
    """
    Customer joins a queue by providing contact details.
    Returns token number and current position.
    """
    try:
        result = await token_service.join_queue(db, queue_id=queue_id, data=body)
        from sqlalchemy import select
        from app.models.queue import Queue
        q_res = await db.execute(select(Queue).where(Queue.id == queue_id))
        queue = q_res.scalar_one_or_none()
        if queue:
            background_tasks.add_task(
                token_service.notify_queue_update,
                queue_id=queue_id,
                org_id=queue.org_id
            )
    except ValueError as exc:
        msg = str(exc)
        if "not found" in msg.lower():
            _raise_404(exc)
        _raise_400(exc)

    await record_event(
        event_type="token.join",
        ip_address=request.client.host if request.client else None,
        resource_type="queue",
        resource_id=str(queue_id),
        details={"token_number": result.token_number, "customer_name": body.name},
    )
    return result


@router.get(
    "/{queue_id}/tokens/{token_number}",
    response_model=PublicTokenResponse,
    summary="Get Token Status (Public)",
    description="Returns the current status and customer info of a ticket.",
)
async def get_public_token(
    queue_id: uuid.UUID,
    token_number: int,
    db: AsyncSession = Depends(get_db),
) -> PublicTokenResponse:
    from app.models.token import Token
    from sqlalchemy import select
    result = await db.execute(
        select(Token).where(
            Token.queue_id == queue_id,
            Token.token_number == token_number
        )
    )
    token = result.scalar_one_or_none()
    if token is None:
        raise HTTPException(status_code=404, detail="Token not found")
    return PublicTokenResponse.model_validate(token)


# ─────────────────────────────────────────────────────────────────────────────
# Admin — Advance queue to next token
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/{queue_id}/admin-join",
    response_model=JoinResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add Customer (Admin)",
    description="Admin manually generates a token for a customer.",
)
async def admin_join(
    queue_id: uuid.UUID,
    body: JoinRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> JoinResponse:
    try:
        # Verify queue belongs to current_user's org
        await queue_service.get_queue_or_404(db, queue_id=queue_id, org_id=current_user.org_id)
        result = await token_service.join_queue(db, queue_id=queue_id, data=body)
        background_tasks.add_task(
            token_service.notify_queue_update,
            queue_id=queue_id,
            org_id=current_user.org_id
        )
    except ValueError as exc:
        msg = str(exc)
        if "not found" in msg.lower():
            _raise_404(exc)
        _raise_400(exc)
    return result

@router.post(
    "/{queue_id}/serve/{token_number}",
    response_model=NextResponse,
    summary="Invite by Number (Admin)",
    description="Directly call a specific waiting token.",
)
async def serve_specific_token(
    queue_id: uuid.UUID,
    token_number: int,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> NextResponse:
    try:
        result = await token_service.serve_specific_token(
            db, queue_id=queue_id, org_id=current_user.org_id, token_number=token_number
        )
        background_tasks.add_task(
            token_service.notify_queue_update, 
            queue_id=queue_id, 
            org_id=current_user.org_id
        )
    except Exception as exc:
        msg = str(exc)
        if "not found" in msg.lower() or "not waiting" in msg.lower():
            _raise_400(exc)
        raise HTTPException(status_code=400, detail=msg)
    return result

# ─────────────────────────────────────────────────────────────────────────────
# Admin — Advance queue to next token (Auto)
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/{queue_id}/next",
    response_model=Union[NextResponse, NoTokenResponse],
    summary="Call Next Token (Admin)",
)
async def call_next(
    queue_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    action: str = "done",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Union[NextResponse, NoTokenResponse]:
    """
    Admin endpoint — move to the next waiting token.
    Concurrency-safe: row-level lock prevents double-serving.
    Action can be "done" or "skipped" to track the previous token correctly.
    """
    try:
        result = await token_service.call_next(
            db, queue_id=queue_id, org_id=current_user.org_id, action=action
        )
        # Always trigger update in background (serving changed or done changed)
        background_tasks.add_task(
            token_service.notify_queue_update,
            queue_id=queue_id,
            org_id=current_user.org_id
        )
    except PermissionError as exc:
        _raise_403(exc)
    except ValueError as exc:
        msg = str(exc)
        if "not found" in msg.lower():
            _raise_404(exc)
        _raise_400(exc)

    if result is None:
        return NoTokenResponse()
    return result
