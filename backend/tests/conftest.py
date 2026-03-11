"""
tests/conftest.py
Shared pytest fixtures — async HTTP client, seeded DB state, auth tokens.

The test suite connects to the RUNNING Docker services (postgres + redis).
Run tests WITH docker-compose up active:
  docker-compose exec backend pytest tests/ -v
"""
import uuid
from typing import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token, hash_password
from app.db.session import AsyncSessionLocal
from app.main import app
from app.models.organization import Organization
from app.models.user import User

# ── Pytest-asyncio global config ─────────────────────────────────────────────
pytest_plugins = ("anyio",)


# ─────────────────────────────────────────────────────────────────────────────
# HTTP client
# ─────────────────────────────────────────────────────────────────────────────
@pytest_asyncio.fixture(scope="session")
async def client() -> AsyncGenerator[AsyncClient, None]:
    """ASGI test client — hits the real FastAPI app in-process."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


# ─────────────────────────────────────────────────────────────────────────────
# Database session
# ─────────────────────────────────────────────────────────────────────────────
@pytest_asyncio.fixture(scope="function")
async def db() -> AsyncGenerator[AsyncSession, None]:
    """Fresh DB session per test — rolls back after each test."""
    async with AsyncSessionLocal() as session:
        yield session
        await session.rollback()


# ─────────────────────────────────────────────────────────────────────────────
# Seeded tenant fixtures
# ─────────────────────────────────────────────────────────────────────────────
@pytest_asyncio.fixture(scope="session")
async def org_a() -> AsyncGenerator[Organization, None]:
    """Org A — persisted for the test session."""
    async with AsyncSessionLocal() as session:
        org = Organization(name="Test Org A", slug=f"test-org-a-{uuid.uuid4().hex[:6]}")
        session.add(org)
        await session.commit()
        await session.refresh(org)
        yield org
        await session.delete(org)
        await session.commit()


@pytest_asyncio.fixture(scope="session")
async def org_b() -> AsyncGenerator[Organization, None]:
    """Org B — separate tenant."""
    async with AsyncSessionLocal() as session:
        org = Organization(name="Test Org B", slug=f"test-org-b-{uuid.uuid4().hex[:6]}")
        session.add(org)
        await session.commit()
        await session.refresh(org)
        yield org
        await session.delete(org)
        await session.commit()


@pytest_asyncio.fixture(scope="session")
async def user_a(org_a: Organization) -> AsyncGenerator[User, None]:
    """Admin user in Org A."""
    async with AsyncSessionLocal() as session:
        user = User(
            org_id=org_a.id,
            email="testadmin@example.com",
            password_hash=hash_password("password_orgA"),
            role="admin",
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        yield user
        await session.delete(user)
        await session.commit()


@pytest_asyncio.fixture(scope="session")
async def user_b(org_b: Organization) -> AsyncGenerator[User, None]:
    """Admin user in Org B — same email as user_a (multi-tenant isolation proof)."""
    async with AsyncSessionLocal() as session:
        user = User(
            org_id=org_b.id,
            email="testadmin@example.com",   # same email, different org
            password_hash=hash_password("password_orgB"),
            role="admin",
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        yield user
        await session.delete(user)
        await session.commit()


# ─────────────────────────────────────────────────────────────────────────────
# Token helpers
# ─────────────────────────────────────────────────────────────────────────────
@pytest.fixture(scope="session")
def token_a(user_a: User, org_a: Organization) -> str:
    return create_access_token(
        user_id=str(user_a.id),
        org_id=str(org_a.id),
        role=user_a.role,
    )


@pytest.fixture(scope="session")
def token_b(user_b: User, org_b: Organization) -> str:
    return create_access_token(
        user_id=str(user_b.id),
        org_id=str(org_b.id),
        role=user_b.role,
    )


@pytest.fixture(scope="session")
def auth_headers_a(token_a: str) -> dict:
    return {"Authorization": f"Bearer {token_a}"}


@pytest.fixture(scope="session")
def auth_headers_b(token_b: str) -> dict:
    return {"Authorization": f"Bearer {token_b}"}
