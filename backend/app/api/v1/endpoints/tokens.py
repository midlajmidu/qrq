"""
app/api/v1/endpoints/tokens.py
Token lifecycle management endpoints (admin protected).

Routes:
  GET    /tokens/{token_id}    → token detail
  PATCH  /tokens/{token_id}/skip  → skip a waiting token
  PATCH  /tokens/{token_id}/done  → complete a serving token
"""
import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_active_user
from app.db.deps import get_db
from app.models.user import User
from app.schemas.queue import TokenResponse, TokenRestoreResponse
from app.services import token_service
from app.models.token import Token

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get(
    "/{token_id}",
    response_model=TokenRestoreResponse,
    summary="Get Token (Public)",
    description="Public endpoint to fetch basic token info for UI restoration.",
)
async def get_token(
    token_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> TokenRestoreResponse:
    from sqlalchemy import select
    from app.models.queue import Queue

    # Join with Queue to get the prefix (used in restoration UI)
    result = await db.execute(
        select(Token, Queue.prefix)
        .join(Queue, Token.queue_id == Queue.id)
        .where(Token.id == token_id)
    )
    row = result.one_or_none()
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Token not found"
        )
    
    token, prefix = row
    
    return TokenRestoreResponse(
        id=token.id,
        token_number=token.token_number,
        status=token.status,
        queue_id=token.queue_id,
        session_id=token.session_id,
        queue_prefix=prefix
    )


@router.patch(
    "/{token_id}/skip",
    response_model=TokenResponse,
    summary="Skip Token",
    description=(
        "Move a 'waiting' token to 'skipped'. "
        "Returns 400 if token is not in 'waiting' state."
    ),
)
async def skip_token(
    token_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> TokenResponse:
    try:
        token = await token_service.skip_token(
            db, token_id=token_id, org_id=current_user.org_id
        )
        background_tasks.add_task(
            token_service.notify_queue_update,
            queue_id=token.queue_id,
            org_id=token.org_id
        )
    except ValueError as exc:
        msg = str(exc)
        code = 404 if "not found" in msg.lower() else 400
        raise HTTPException(status_code=code, detail=msg)
    return TokenResponse.model_validate(token)


@router.patch(
    "/{token_id}/done",
    response_model=TokenResponse,
    summary="Complete Token",
    description=(
        "Move a 'serving' token to 'done'. "
        "Returns 400 if token is not in 'serving' state."
    ),
)
async def complete_token(
    token_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> TokenResponse:
    try:
        token = await token_service.complete_token(
            db, token_id=token_id, org_id=current_user.org_id
        )
        background_tasks.add_task(
            token_service.notify_queue_update,
            queue_id=token.queue_id,
            org_id=token.org_id
        )
    except ValueError as exc:
        msg = str(exc)
        code = 404 if "not found" in msg.lower() else 400
        raise HTTPException(status_code=code, detail=msg)
    return TokenResponse.model_validate(token)


@router.patch(
    "/{token_id}/remove",
    response_model=TokenResponse,
    summary="Remove Token",
    description=(
        "Mark a 'waiting' or 'serving' token as 'skipped'. "
        "Will automatically call next if the token is currently serving."
    ),
)
async def remove_token(
    token_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> TokenResponse:
    try:
        token = await token_service.remove_token(
            db, token_id=token_id, org_id=current_user.org_id
        )
        background_tasks.add_task(
            token_service.notify_queue_update,
            queue_id=token.queue_id,
            org_id=token.org_id
        )
    except ValueError as exc:
        msg = str(exc)
        code = 404 if "not found" in msg.lower() else 400
        raise HTTPException(status_code=code, detail=msg)
    return TokenResponse.model_validate(token)
