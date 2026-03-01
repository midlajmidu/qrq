"""
app/db/deps.py
FastAPI dependency: yields a managed async DB session per request.
"""
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import AsyncSessionLocal


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency that provides a new AsyncSession for every request.
    The session is automatically closed (and rolled back on error).
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
