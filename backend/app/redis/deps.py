"""
app/redis/deps.py
FastAPI dependency: yields the shared Redis client for injection into routes.
"""
from redis.asyncio import Redis
from app.redis.client import get_redis


def get_redis_client() -> Redis:
    """Dependency for injecting the Redis client into routes."""
    return get_redis()
