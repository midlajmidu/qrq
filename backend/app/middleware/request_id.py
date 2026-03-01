"""
app/middleware/request_id.py
Request ID middleware — generates a UUID per HTTP request.

Injected into:
  - request.state.request_id (for use in route handlers)
  - response header X-Request-ID (for client correlation)
  - logging context (via LoggingMiddleware)
"""
import logging
import uuid

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

logger = logging.getLogger(__name__)


class RequestIdMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        # Use client-provided ID if present, else generate
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        request.state.request_id = request_id

        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id

        return response
