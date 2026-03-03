"""
app/services/auth_service.py
Authentication business logic.

Security rules enforced here:
  - Generic error on bad credentials (no email/org leak)
  - No password logged anywhere
  - Deactivated orgs/users are rejected before token generation
"""
import logging
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token, verify_password
from app.models.organization import Organization
from app.models.user import User

logger = logging.getLogger(__name__)

# Generic message — prevent enumeration attacks
_INVALID_CREDENTIALS = "Invalid credentials"


async def authenticate_user(
    db: AsyncSession,
    *,
    email: str,
    plain_password: str,
    org_slug: str,
) -> str:
    """
    Validate credentials for a specific organization and return a JWT.

    Flow:
      1. Find org by slug
      2. Find user by (email, org_id) — tenant-scoped lookup
      3. Verify password (constant-time)
      4. Check is_active on both org and user
      5. Issue JWT

    Raises:
      ValueError with a generic message on any failure.
    """
    logger.info("Login attempt | org_slug=%s email=%s", org_slug, email)

    # ── 1. Resolve organization ────────────────────────────────────
    org_result = await db.execute(
        select(Organization).where(Organization.slug == org_slug)
    )
    org: Organization | None = org_result.scalar_one_or_none()

    if org is None:
        logger.warning("Login failed: org not found | slug=%s", org_slug)
        raise ValueError(_INVALID_CREDENTIALS)

    if not org.is_active:
        logger.warning("Login failed: org inactive | slug=%s", org_slug)
        raise ValueError(_INVALID_CREDENTIALS)

    # ── 2. Find user scoped to THIS org only ───────────────────────
    user_result = await db.execute(
        select(User).where(
            User.email == email,
            User.org_id == org.id,        # ← TENANT ISOLATION
        )
    )
    user: User | None = user_result.scalar_one_or_none()

    if user is None:
        logger.warning("Login failed: user not found | email=%s org=%s", email, org_slug)
        raise ValueError(_INVALID_CREDENTIALS)

    # ── 3. Verify password (constant-time bcrypt) ──────────────────
    if not verify_password(plain_password, user.password_hash):
        logger.warning("Login failed: bad password | email=%s org=%s", email, org_slug)
        raise ValueError(_INVALID_CREDENTIALS)

    # ── 4. Active check ────────────────────────────────────────────
    if not user.is_active:
        logger.warning("Login failed: user inactive | email=%s org=%s", email, org_slug)
        raise ValueError(_INVALID_CREDENTIALS)

    # ── 5. Issue JWT ───────────────────────────────────────────────
    token = create_access_token(
        user_id=str(user.id),
        org_id=str(org.id),
        role=user.role,
    )

    logger.info("Login successful | user_id=%s org=%s role=%s", user.id, org_slug, user.role)
    return token


_SUPER_ADMIN_ORG_SLUG = "super-admin-system"


async def authenticate_super_admin(
    db: AsyncSession,
    *,
    email: str,
    plain_password: str,
) -> str:
    """
    Authenticate a super admin by email + password only.
    Super admins live in the sentinel org with slug='super-admin-system'.
    Raises ValueError on any failure (generic message to prevent enumeration).
    """
    logger.info("Super-admin login attempt | email=%s", email)

    # Resolve the sentinel org
    org_result = await db.execute(
        select(Organization).where(Organization.slug == _SUPER_ADMIN_ORG_SLUG)
    )
    org: Organization | None = org_result.scalar_one_or_none()
    if org is None or not org.is_active:
        logger.warning("Super-admin login: sentinel org missing or inactive")
        raise ValueError(_INVALID_CREDENTIALS)

    # Find user in that org with role == super_admin
    from sqlalchemy import and_
    user_result = await db.execute(
        select(User).where(
            and_(
                User.email == email,
                User.org_id == org.id,
                User.role == "super_admin",
            )
        )
    )
    user: User | None = user_result.scalar_one_or_none()

    if user is None:
        logger.warning("Super-admin login: user not found | email=%s", email)
        raise ValueError(_INVALID_CREDENTIALS)

    if not verify_password(plain_password, user.password_hash):
        logger.warning("Super-admin login: bad password | email=%s", email)
        raise ValueError(_INVALID_CREDENTIALS)

    if not user.is_active:
        logger.warning("Super-admin login: user inactive | email=%s", email)
        raise ValueError(_INVALID_CREDENTIALS)

    token = create_access_token(
        user_id=str(user.id),
        org_id=str(org.id),
        role=user.role,
    )
    logger.info("Super-admin login successful | user_id=%s", user.id)
    return token
