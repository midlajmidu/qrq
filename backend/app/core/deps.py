"""
app/core/deps.py
FastAPI dependency functions for authentication and tenant isolation.

Security rules:
  - NEVER log raw tokens
  - NEVER expose internal errors to the client
  - Refresh user from DB on every request (catches deactivation mid-session)
"""
import logging
import uuid

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_access_token
from app.db.deps import get_db
from app.models.user import User

logger = logging.getLogger(__name__)

# Extracts the Bearer token from the Authorization header
_bearer = HTTPBearer(auto_error=False)

_CREDENTIALS_EXCEPTION = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Invalid or expired credentials",
    headers={"WWW-Authenticate": "Bearer"},
)

_INACTIVE_USER_EXCEPTION = HTTPException(
    status_code=status.HTTP_403_FORBIDDEN,
    detail="User account is deactivated",
)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Dependency: validates Bearer JWT and returns the live User row.

    Fails with 401 if:
      - No token provided
      - Signature invalid
      - Token expired
      - User not found in DB (deleted after token issuance)

    Fails with 403 if:
      - User.is_active == False (deactivated after token issuance)
    """
    if credentials is None:
        logger.warning("Request with no Bearer token")
        raise _CREDENTIALS_EXCEPTION

    # ── Decode & validate signature / expiry ──────────────────────
    try:
        payload = decode_access_token(credentials.credentials)
    except JWTError:
        raise _CREDENTIALS_EXCEPTION

    user_id_raw: str | None = payload.get("sub")
    role_raw: str | None = payload.get("role")
    org_id_raw: str | None = payload.get("org_id")

    if not user_id_raw or not role_raw:
        logger.warning("Token missing sub or role claim")
        raise _CREDENTIALS_EXCEPTION
        
    if role_raw == "super_admin":
        if org_id_raw is not None:
            logger.warning("Super admin token provided with org_id")
            raise _CREDENTIALS_EXCEPTION
    else:
        if org_id_raw is None:
            logger.warning("Normal token missing org_id claim")
            raise _CREDENTIALS_EXCEPTION

    # ── Parse UUIDs ────────────────────────────────────────────────
    try:
        user_id = uuid.UUID(user_id_raw)
        org_id = uuid.UUID(org_id_raw) if org_id_raw else None
    except ValueError:
        raise _CREDENTIALS_EXCEPTION

    # ── Fetch user from DB (always fresh — catches deactivation) ───
    if org_id:
        result = await db.execute(
            select(User).where(
                User.id == user_id,
                User.org_id == org_id,    # ← TENANT ISOLATION enforced
            )
        )
    else:
        result = await db.execute(
            select(User).where(
                User.id == user_id,
                User.org_id.is_(None),    # ← Super admin case
            )
        )
    user: User | None = result.scalar_one_or_none()

    if user is None:
        logger.warning("Token refers to non-existent user | user_id=%s", user_id)
        raise _CREDENTIALS_EXCEPTION

    if not user.is_active:
        logger.warning("Token presented for inactive user | user_id=%s", user_id)
        raise _INACTIVE_USER_EXCEPTION

    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Convenience alias — handy for routes that want an explicit
    active-user dependency without the inline is_active check.
    """
    return current_user


async def get_current_super_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Dependency: allows access ONLY to users with role == 'super_admin'.
    Raise 403 for any other authenticated user.
    """
    if current_user.role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super admin access required",
        )
    return current_user


def require_super_admin() -> callable:
    """
    Dependency that enforces the user has the 'super_admin' role.
    Usage:
        user = Depends(require_super_admin())
    """
    return get_current_super_admin
