"""
app/monitoring/metrics.py
Prometheus metrics for the Queue Management SaaS.

AUDIT FIX: Removed high-cardinality labels (org_id, queue_id, ip).
All counters are now global or low-cardinality (prefix only).
Use structured logs for per-org/per-queue breakdowns instead.

Exposes custom counters, histograms, and gauges:
  - Queue operations (join, next, skip, done)
  - WebSocket connections
  - Redis pub/sub health
  - DB pool status
  - Rate limiting events

Auto-instrumented via prometheus-fastapi-instrumentator for:
  - Request count by endpoint
  - Request latency histogram
  - Error count
"""
import logging
from prometheus_client import Counter, Gauge, Histogram, Info

logger = logging.getLogger(__name__)

# ── Application info ──────────────────────────────────────────────────────────
APP_INFO = Info("app", "Application metadata")

# ── Queue engine metrics ──────────────────────────────────────────────────────
# AUDIT: NO org_id/queue_id labels — prevents cardinality explosion.
# Use structured logging for per-org breakdowns.
TOKEN_CREATED = Counter(
    "queue_tokens_created_total",
    "Total tokens issued across all queues",
)
NEXT_CALLED = Counter(
    "queue_next_called_total",
    "Total Next calls across all queues",
)
TOKEN_SKIPPED = Counter(
    "queue_tokens_skipped_total",
    "Total tokens skipped",
)
TOKEN_COMPLETED = Counter(
    "queue_tokens_completed_total",
    "Total tokens completed (done)",
)
QUEUE_LOCK_DURATION = Histogram(
    "queue_lock_duration_seconds",
    "Time spent holding the queue row lock",
    buckets=[0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.0],
)

# ── WebSocket metrics ────────────────────────────────────────────────────────
# AUDIT: Removed per-channel label — use total gauge only.
WS_ACTIVE_CONNECTIONS = Gauge(
    "ws_active_connections_total",
    "Total currently active WebSocket connections across all channels",
)
WS_CONNECTIONS_TOTAL = Counter(
    "ws_connections_total",
    "Total WebSocket connections established",
)
WS_DISCONNECTIONS_TOTAL = Counter(
    "ws_disconnections_total",
    "Total WebSocket disconnections",
)

# ── Redis metrics ─────────────────────────────────────────────────────────────
REDIS_PUBLISH_TOTAL = Counter(
    "redis_publish_total",
    "Total Redis publish operations",
)
REDIS_PUBLISH_ERRORS = Counter(
    "redis_publish_errors_total",
    "Failed Redis publish operations",
)
REDIS_RECONNECTS = Counter(
    "redis_reconnects_total",
    "Redis subscriber reconnection attempts",
)

# ── Rate limiting metrics ────────────────────────────────────────────────────
# AUDIT: Removed "ip" label — attackers could generate infinite label values.
# Only keep low-cardinality "prefix" (login, join, api, ws — max 4 values).
RATE_LIMIT_HITS = Counter(
    "rate_limit_hits_total",
    "Requests rejected by rate limiter",
    ["prefix"],
)

# ── DB pool metrics ───────────────────────────────────────────────────────────
DB_POOL_SIZE = Gauge("db_pool_size", "Current DB connection pool size")
DB_POOL_CHECKED_IN = Gauge("db_pool_checked_in", "Idle DB connections")
DB_POOL_CHECKED_OUT = Gauge("db_pool_checked_out", "Active DB connections")
DB_POOL_OVERFLOW = Gauge("db_pool_overflow", "DB pool overflow connections")


def init_app_info():
    from app.core.config import get_settings
    s = get_settings()
    APP_INFO.info({
        "version": s.VERSION,
        "environment": s.ENVIRONMENT,
    })
