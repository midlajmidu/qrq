"""
app/monitoring/pool_monitor.py
Periodic background task that exports DB pool metrics to Prometheus.

Runs every 15 seconds to update gauges:
  - pool_size
  - checked_in (idle)
  - checked_out (active)
  - overflow

Also logs warnings if pool is near exhaustion.
"""
import asyncio
import logging

from app.monitoring.metrics import (
    DB_POOL_SIZE,
    DB_POOL_CHECKED_IN,
    DB_POOL_CHECKED_OUT,
    DB_POOL_OVERFLOW,
)

logger = logging.getLogger(__name__)

_monitor_task = None


async def _monitor_loop():
    """Periodically export DB pool stats to Prometheus."""
    while True:
        try:
            from app.db.session import engine
            if engine is None:
                await asyncio.sleep(15)
                continue

            pool = engine.pool
            DB_POOL_SIZE.set(pool.size())
            DB_POOL_CHECKED_IN.set(pool.checkedin())
            DB_POOL_CHECKED_OUT.set(pool.checkedout())
            DB_POOL_OVERFLOW.set(pool.overflow())

            # Warn if pool running hot
            total = pool.size() + pool.overflow()
            active = pool.checkedout()
            if total > 0 and active / total > 0.8:
                logger.warning(
                    "DB pool running hot | active=%d total=%d (%.0f%%)",
                    active, total, (active / total) * 100,
                )
        except Exception as exc:
            logger.debug("Pool monitor error: %s", exc)
        await asyncio.sleep(15)


async def start_pool_monitor():
    global _monitor_task
    _monitor_task = asyncio.create_task(_monitor_loop())
    logger.info("DB pool monitor started")


async def stop_pool_monitor():
    global _monitor_task
    if _monitor_task:
        _monitor_task.cancel()
        try:
            await _monitor_task
        except asyncio.CancelledError:
            pass
    logger.info("DB pool monitor stopped")
