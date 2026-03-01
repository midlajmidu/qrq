"""
app/redis/client.py
Async Redis connection pool — ready for Pub/Sub, caching, and rate-limiting.
"""
import logging
from typing import Optional

import redis.asyncio as aioredis
from redis.asyncio import Redis

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# Module-level singleton — set during app startup
_redis_client: Optional[Redis] = None


def get_redis() -> Redis:
    """Return the active Redis client. Must be called after startup."""
    if _redis_client is None:
        raise RuntimeError("Redis client is not initialised. Call connect_redis() first.")
    return _redis_client


async def connect_redis() -> None:
    """Create the Redis connection pool and verify connectivity."""
    global _redis_client

    _redis_client = aioredis.from_url(
        settings.REDIS_URL,
        encoding="utf-8",
        decode_responses=True,
        max_connections=settings.REDIS_POOL_SIZE,
        socket_connect_timeout=5,
        socket_timeout=5,
    )

    # Verify connection
    pong = await _redis_client.ping()
    if not pong:
        raise ConnectionError("Redis did not respond to PING.")

    logger.info("Redis connection pool ready | url=%s", settings.REDIS_URL)


async def disconnect_redis() -> None:
    """Close the Redis connection pool on shutdown."""
    global _redis_client
    if _redis_client:
        await _redis_client.aclose()
        _redis_client = None
        logger.info("Redis connection pool closed.")
