import asyncio
from app.db.session import AsyncSessionLocal
from app.models.call_log import CallLog
from sqlalchemy import select

async def fix():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(CallLog).where(CallLog.call_status == "completed"))
        logs = res.scalars().all()
        fixed_count = 0
        for log in logs:
            # Fix legacy logs where ring time was recorded as conversation duration
            if log.ring_duration_seconds == 0 and log.duration_seconds > 0:
                log.ring_duration_seconds = log.duration_seconds
                log.duration_seconds = 0
                log.call_status = "cancelled" if log.ring_duration_seconds < 5 else "no_answer"
                fixed_count += 1
                print(f"Updated log {log.id}: status={log.call_status}, duration=0s, ring={log.ring_duration_seconds}s")
        await db.commit()
        print(f"Successfully fixed {fixed_count} call log records.")

if __name__ == "__main__":
    asyncio.run(fix())
