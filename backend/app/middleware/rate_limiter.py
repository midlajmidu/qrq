"""
app/middleware/rate_limiter.py
Redis-backed sliding window rate limiter.

AUDIT FIXES:
  - Fixed Retry-After calculation (was always returning 1)
  - Removed IP from metrics label (high-cardinality risk)
  - Added request tracking to rate_limit metrics counter

Keyed by IP address.
Uses atomic Redis pipeline — no race conditions.
Returns 429 Too Many Requests on violation.

Usage:
  rate_limit_dep = RateLimitDependency(max_requests=10, window_seconds=60, prefix="login")
  @router.post("/login", dependencies=[Depends(rate_limit_dep)])
"""
import logging
import time

from fastapi import HTTPException, Request, status
from redis.asyncio import Redis

from app.redis.client import get_redis
from app.core.config import get_settings

logger = logging.getLogger(__name__)


class RateLimitDependency:
    """
    FastAPI dependency for per-endpoint rate limiting.

    Algorithm: Sliding window counter using Redis sorted sets.
      - Key = rate_limit:{prefix}:{client_ip}
      - Members = timestamps of requests
      - Window = last N seconds
      - Atomic via pipeline
    """

    def __init__(
        self,
        max_requests: int,
        window_seconds: int = 60,
        prefix: str = "default",
    ):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.prefix = prefix

    async def __call__(self, request: Request) -> None:
        try:
            redis: Redis = get_redis()
        except RuntimeError:
            # Redis unavailable — degrade gracefully, allow request
            logger.warning("Rate limiter skipped: Redis unavailable")
            return

        client_ip = request.client.host if request.client else "unknown"
        key = f"rate_limit:{self.prefix}:{client_ip}"
        now = time.time()
        window_start = now - self.window_seconds

        try:
            pipe = redis.pipeline()
            # Remove expired entries
            pipe.zremrangebyscore(key, 0, window_start)
            # Count remaining entries in window
            pipe.zcard(key)
            # Add current request
            pipe.zadd(key, {str(now): now})
            # Set TTL so keys auto-expire
            pipe.expire(key, self.window_seconds + 1)
            # Get the oldest entry still in window (for Retry-After calc)
            pipe.zrange(key, 0, 0, withscores=True)
            results = await pipe.execute()

            request_count = results[1]

            if request_count >= self.max_requests:
                # AUDIT FIX: Calculate actual time until oldest entry expires
                oldest_entries = results[4]
                if oldest_entries:
                    oldest_timestamp = oldest_entries[0][1]
                    retry_after = int(self.window_seconds - (now - oldest_timestamp)) + 1
                else:
                    retry_after = self.window_seconds

                retry_after = max(retry_after, 1)

                logger.warning(
                    "Rate limited | ip=%s prefix=%s count=%d limit=%d",
                    client_ip, self.prefix, request_count, self.max_requests,
                )

                # Track in metrics (low-cardinality: prefix only, NOT ip)
                try:
                    from app.monitoring.metrics import RATE_LIMIT_HITS
                    RATE_LIMIT_HITS.labels(prefix=self.prefix).inc()
                except Exception:
                    pass

                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Too many requests. Please try again later.",
                    headers={"Retry-After": str(retry_after)},
                )
        except HTTPException:
            raise
        except Exception as exc:
            # Redis failure — degrade gracefully
            logger.error("Rate limiter error: %s", exc)


# ── Pre-built rate limiters for common endpoints ──────────────────────────────

_s = get_settings()

login_rate_limit = RateLimitDependency(
    max_requests=_s.RATE_LIMIT_LOGIN, window_seconds=60, prefix="login"
)
join_rate_limit = RateLimitDependency(
    max_requests=_s.RATE_LIMIT_JOIN, window_seconds=60, prefix="join"
)
api_rate_limit = RateLimitDependency(
    max_requests=_s.RATE_LIMIT_API, window_seconds=60, prefix="api"
)
ws_rate_limit = RateLimitDependency(
    max_requests=_s.RATE_LIMIT_WS, window_seconds=60, prefix="ws"
)
