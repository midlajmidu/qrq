"""
app/middleware/logging_middleware.py
Structured logging middleware — logs every request with correlation data.

Includes:
  - request_id
  - method, path, status_code
  - latency_ms
  - client IP
  - org_id + user_id (if authenticated via JWT)

Never logs: passwords, JWT tokens, secrets.
"""
import logging
import time

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

logger = logging.getLogger("app.access")

# Fields that must NEVER appear in logs
REDACTED_FIELDS = {"password", "token", "secret", "authorization"}


class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        start = time.perf_counter()

        # Extract request_id (set by RequestIdMiddleware)
        request_id = getattr(request.state, "request_id", "unknown")

        response = await call_next(request)

        latency_ms = (time.perf_counter() - start) * 1000
        client_ip = request.client.host if request.client else "unknown"

        # Extract org_id/user_id from state (set by auth dependency)
        org_id = getattr(request.state, "org_id", None)
        user_id = getattr(request.state, "user_id", None)

        # Skip noisy endpoints
        path = request.url.path
        if path in ("/health", "/metrics"):
            return response

        log_data = {
            "request_id": request_id,
            "method": request.method,
            "path": path,
            "status": response.status_code,
            "latency_ms": round(latency_ms, 2),
            "ip": client_ip,
        }
        if org_id:
            log_data["org_id"] = org_id
        if user_id:
            log_data["user_id"] = user_id

        if response.status_code >= 500:
            logger.error("request | %s", log_data)
        elif response.status_code >= 400:
            logger.warning("request | %s", log_data)
        else:
            logger.info("request | %s", log_data)

        return response
