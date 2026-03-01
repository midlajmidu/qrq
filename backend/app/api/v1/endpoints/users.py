"""
app/api/v1/endpoints/users.py
Protected user endpoints.

GET /users/me
  - Requires valid JWT
  - Returns current user's safe profile
  - Validates: no token → 401, invalid → 401, inactive → 403
"""
import logging

from fastapi import APIRouter, Depends

from app.core.deps import get_current_active_user
from app.models.user import User
from app.schemas.user import UserResponse

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get Current User",
    description="Returns the authenticated user's profile. Requires a valid Bearer token.",
)
async def get_me(
    current_user: User = Depends(get_current_active_user),
) -> UserResponse:
    """
    Protected endpoint — returns caller's own profile.
    No password_hash is ever included in the response.
    """
    logger.debug("GET /me | user_id=%s org_id=%s", current_user.id, current_user.org_id)
    return UserResponse.model_validate(current_user)
