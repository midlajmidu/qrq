"""
app/api/v1/endpoints/sessions.py
Session management endpoints.

Routes:
  POST   /sessions                          → create session
  GET    /sessions                          → list org's sessions
  GET    /sessions/{session_id}             → get session detail
  DELETE /sessions/{session_id}             → delete session
  GET    /sessions/{session_id}/queues      → list queues in session
  POST   /sessions/{session_id}/queues      → create queue in session
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_active_user
from app.db.deps import get_db
from app.models.user import User
from app.schemas.session import SessionCreate, SessionResponse
from app.schemas.queue import QueueCreate, QueueResponse
from app.services import session_service, queue_service
from app.middleware.rate_limiter import api_rate_limit

router = APIRouter()


# ── Helpers ───────────────────────────────────────────────────────
def _raise_404(exc: Exception) -> None:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


# ── Session CRUD ─────────────────────────────────────────────────

@router.post(
    "",
    response_model=SessionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Session",
    dependencies=[Depends(api_rate_limit)],
)
async def create_session(
    body: SessionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> SessionResponse:
    """Create a new session (date) for the authenticated organization."""
    try:
        session = await session_service.create_session(
            db, org_id=current_user.org_id, data=body
        )
    except Exception as exc:
        detail = str(exc)
        if "uq_session_org_date" in detail.lower() or "unique" in detail.lower():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A session for this date already exists.",
            )
        raise HTTPException(status_code=400, detail=detail)
    return SessionResponse(
        id=session.id,
        org_id=session.org_id,
        session_date=session.session_date,
        title=session.title,
        created_at=session.created_at,
        queue_count=0,
    )


@router.get(
    "",
    response_model=list[SessionResponse],
    summary="List Sessions",
)
async def list_sessions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> list[SessionResponse]:
    """List all sessions for the authenticated organization."""
    rows = await session_service.list_sessions(db, org_id=current_user.org_id)
    return [SessionResponse(**row) for row in rows]


@router.get(
    "/{session_id}",
    response_model=SessionResponse,
    summary="Get Session",
)
async def get_session(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> SessionResponse:
    """Get a specific session."""
    try:
        session = await session_service.get_session_or_404(
            db, session_id=session_id, org_id=current_user.org_id,
        )
    except ValueError as exc:
        _raise_404(exc)
    # Count queues
    queues = await queue_service.list_queues(db, org_id=current_user.org_id, session_id=session_id)
    return SessionResponse(
        id=session.id,
        org_id=session.org_id,
        session_date=session.session_date,
        title=session.title,
        created_at=session.created_at,
        queue_count=len(queues),
    )


@router.delete(
    "/{session_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete Session",
    description="Deletes a session and all its queues and tokens.",
)
async def delete_session(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> None:
    try:
        await session_service.delete_session(
            db, session_id=session_id, org_id=current_user.org_id,
        )
    except ValueError as exc:
        _raise_404(exc)


# ── Queues inside session ────────────────────────────────────────

@router.get(
    "/{session_id}/queues",
    response_model=list[QueueResponse],
    summary="List Queues in Session",
)
async def list_session_queues(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> list[QueueResponse]:
    """List all queues belonging to a specific session."""
    # Verify session exists and belongs to org
    try:
        await session_service.get_session_or_404(
            db, session_id=session_id, org_id=current_user.org_id,
        )
    except ValueError as exc:
        _raise_404(exc)

    queues = await queue_service.list_queues(
        db, org_id=current_user.org_id, session_id=session_id,
    )
    return [QueueResponse.model_validate(q) for q in queues]


@router.post(
    "/{session_id}/queues",
    response_model=QueueResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Queue in Session",
    dependencies=[Depends(api_rate_limit)],
)
async def create_session_queue(
    session_id: uuid.UUID,
    body: QueueCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> QueueResponse:
    """Create a new queue inside a specific session."""
    # Verify session exists and belongs to org
    try:
        await session_service.get_session_or_404(
            db, session_id=session_id, org_id=current_user.org_id,
        )
    except ValueError as exc:
        _raise_404(exc)

    try:
        queue = await queue_service.create_queue(
            db,
            org_id=current_user.org_id,
            data=body,
            session_id=session_id,
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return QueueResponse.model_validate(queue)
