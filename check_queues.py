import asyncio
import uuid
import app.db.base
from app.db.session import AsyncSessionLocal
from app.models.queue import Queue
from sqlalchemy import select

async def main():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(Queue))
        queues = res.scalars().all()
        if not queues:
            print("No queues found.")
            return
        for q in queues:
            print(f"ID: {q.id}, Name: {q.name}, Org: {q.org_id}, Prefix: {q.prefix}, Active: {q.is_active}")

if __name__ == "__main__":
    asyncio.run(main())
