"""
scripts/seed.py
Development seed script — creates test orgs, users, and queues.

Usage (inside Docker):
  docker-compose exec backend python scripts/seed.py
"""
import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select
from app.db.session import AsyncSessionLocal, connect_db
from app.models.organization import Organization
from app.models.user import User
from app.models.queue import Queue
from app.models.token import Token  # Ensure all models are registered
from app.core.security import hash_password


ORGS = [
    {"name": "Acme Clinic",   "slug": "org-a"},
    {"name": "Beta Hospital", "slug": "org-b"},
]

USERS = [
    {"email": "admin@acme.com",  "password": "password123", "org_slug": "org-a", "role": "admin"},
    {"email": "admin@acme.com",  "password": "password456", "org_slug": "org-b", "role": "admin"},
    {"email": "staff@acme.com",  "password": "staffpass1",  "org_slug": "org-a", "role": "staff"},

]

QUEUES = [
    {"org_slug": "org-a", "name": "General",   "prefix": "G"},
    {"org_slug": "org-a", "name": "Priority",  "prefix": "P"},
    {"org_slug": "org-b", "name": "Reception", "prefix": "R"},
]


async def seed() -> None:
    await connect_db()

    async with AsyncSessionLocal() as db:
        org_map: dict[str, Organization] = {}

        print("\n── Organizations ──")
        for org_data in ORGS:
            result = await db.execute(
                select(Organization).where(Organization.slug == org_data["slug"])
            )
            org = result.scalar_one_or_none()
            if org is None:
                org = Organization(**org_data)
                db.add(org)
                await db.flush()
                print(f"  ✓ Created org: {org.slug}")
            else:
                print(f"  · Exists:      {org.slug}")
            org_map[org.slug] = org

        print("\n── Users ──")
        for u in USERS:
            org = org_map[u["org_slug"]]
            result = await db.execute(
                select(User).where(User.email == u["email"], User.org_id == org.id)
            )
            user = result.scalar_one_or_none()
            if user is None:
                user = User(
                    org_id=org.id,
                    email=u["email"],
                    password_hash=hash_password(u["password"]),
                    role=u["role"],
                )
                db.add(user)
                print(f"  ✓ Created user: {u['email']} @ {org.slug} [{u['role']}]")
            else:
                print(f"  · Exists:       {u['email']} @ {org.slug}")

        print("\n── Queues ──")
        for q_data in QUEUES:
            org = org_map[q_data["org_slug"]]
            result = await db.execute(
                select(Queue).where(Queue.name == q_data["name"], Queue.org_id == org.id)
            )
            queue = result.scalar_one_or_none()
            if queue is None:
                queue = Queue(
                    org_id=org.id,
                    name=q_data["name"],
                    prefix=q_data["prefix"],
                )
                db.add(queue)
                print(f"  ✓ Created queue: {q_data['name']} [{q_data['prefix']}] @ {org.slug}")
            else:
                print(f"  · Exists:        {q_data['name']} @ {org.slug}")

        await db.commit()

    print("\n✅ Seed complete.\n")
    print("  Login Org A: POST /api/v1/auth/login")
    print('  Body: {"email":"admin@acme.com","password":"password123","organization_slug":"org-a"}')


if __name__ == "__main__":
    asyncio.run(seed())
