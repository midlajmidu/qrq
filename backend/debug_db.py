import asyncio
import uuid
from sqlalchemy import select
from app.db.session import engine
from app.models.user import User
from app.models.organization import Organization

async def debug_db():
    print("Checking database...")
    async with engine.connect() as conn:
        # Check Orgs
        org_res = await conn.execute(select(Organization))
        orgs = org_res.fetchall()
        print(f"\nFound {len(orgs)} organizations:")
        for o in orgs:
            print(f"ID: {o.id}, Name: {o.name}, Slug: {o.slug}")

        # Check Users
        user_res = await conn.execute(select(User))
        users = user_res.fetchall()
        print(f"\nFound {len(users)} users:")
        for u in users:
            print(f"ID: {u.id}, Email: {u.email}, Role: {u.role}, Org: {u.org_id}, InitPwd: {u.initial_password}")

if __name__ == "__main__":
    asyncio.run(debug_db())
