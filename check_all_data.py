import asyncio
import app.db.base
from app.db.session import AsyncSessionLocal
from app.models.organization import Organization
from app.models.queue import Queue
from app.models.user import User
from sqlalchemy import select

async def main():
    async with AsyncSessionLocal() as db:
        print("--- Organizations ---")
        res = await db.execute(select(Organization))
        for o in res.scalars().all():
            print(f"ID: {o.id}, Name: {o.name}, Slug: {o.slug}")
        
        print("\n--- Queues ---")
        res = await db.execute(select(Queue))
        for q in res.scalars().all():
            print(f"ID: {q.id}, Name: {q.name}, Org: {q.org_id}")

        print("\n--- Users ---")
        res = await db.execute(select(User))
        for u in res.scalars().all():
            print(f"ID: {u.id}, Email: {u.email}, Role: {u.role}, Org: {u.org_id}")

if __name__ == "__main__":
    asyncio.run(main())
