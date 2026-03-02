import logging
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import engine
from app.models.organization import Organization
from app.models.user import User
from app.core.security import hash_password

logger = logging.getLogger(__name__)

async def bootstrap_db() -> None:
    """
    Production-safe database bootstrap.
    Ensures a default organization and admin user exist if the DB is empty.
    """
    async with AsyncSession(engine) as session:
        # Check if any organizations exist
        result = await session.execute(select(func.count()).select_from(Organization))
        count = result.scalar() or 0

        if count > 0:
            return  # Database is already initialized

        try:
            logger.info("Starting database bootstrap process...")

            # Create Super Admin User (No organization attached)
            super_admin = User(
                email="admin@flowclinic.com",
                password_hash=hash_password("Admin@123"),
                role="super_admin",
                is_active=True,
                org_id=None
            )
            session.add(super_admin)
            
            await session.commit()
            logger.warning("⚠ Bootstrap super_admin created. Change password immediately.")
            
        except Exception as e:
            await session.rollback()
            logger.error("Failed to bootstrap database: %s", e)
            raise
