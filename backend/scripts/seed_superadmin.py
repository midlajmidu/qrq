"""
scripts/seed_superadmin.py
Create the super-admin sentinel org and super admin user.

Usage (inside Docker):
  docker exec queue_backend python scripts/seed_superadmin.py

Safe to run multiple times — idempotent.
"""
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select
from app.db.session import AsyncSessionLocal, connect_db
from app.models.organization import Organization
from app.models.user import User
from app.core.security import hash_password

SENTINEL_ORG_SLUG = "super-admin-system"
SENTINEL_ORG_NAME = "Super Admin System"

# ── Change these before first run ──────────────────────────────────
SUPER_ADMIN_EMAIL    = os.getenv("SUPER_ADMIN_EMAIL", "superadmin@qrq.internal")
SUPER_ADMIN_PASSWORD = os.getenv("SUPER_ADMIN_PASSWORD", "SuperAdmin@2026!!!")
# ──────────────────────────────────────────────────────────────────


async def seed_superadmin() -> None:
    await connect_db()

    async with AsyncSessionLocal() as db:
        print("\n── Global Super Admin Setup ──")

        # Create/Update Super admin user
        res = await db.execute(
            select(User).where(
                User.email == SUPER_ADMIN_EMAIL,
                User.org_id.is_(None),
            )
        )
        user = res.scalar_one_or_none()
        if user is None:
            user = User(
                org_id=None,
                email=SUPER_ADMIN_EMAIL,
                password_hash=hash_password(SUPER_ADMIN_PASSWORD),
                role="super_admin",
            )
            db.add(user)
            print(f"  ✓ Created: {SUPER_ADMIN_EMAIL}")
        else:
            user.password_hash = hash_password(SUPER_ADMIN_PASSWORD)
            print(f"  ✓ Updated password for: {SUPER_ADMIN_EMAIL}")

        await db.commit()

    print("\n✅ Global Super admin ready.")
    print(f"\n  Login URL : http://localhost:3000/super-admin/login")
    print(f"  Email     : {SUPER_ADMIN_EMAIL}")
    print(f"  Password  : {SUPER_ADMIN_PASSWORD}")


if __name__ == "__main__":
    asyncio.run(seed_superadmin())
