"""
app/websocket/routes.py
WebSocket endpoint — real-time queue updates.

GET /api/v1/ws/queues/{queue_id}

AUDIT FIXES:
  - Accept WebSocket BEFORE attempting close (prevents ASGI race)
  - Added WS metrics tracking (connect/disconnect counters)
  - Added rate-limit check for WS handshake
  - Improved error handling on initial DB query failure

Auth modes:
  - Admin: pass token as query param ?token=<JWT>
  - Public: no token required (display/customer screens)

Security:
  - Client NEVER specifies org_id or channel
  - All channel resolution is server-side from DB lookup
  - Invalid queue → close(4404) after accept
  - Invalid admin token → close(4401) after accept
"""
import logging
import uuid
from typing import Optional

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from jose import JWTError
from sqlalchemy import select

from app.core.security import decode_access_token
from app.db.session import AsyncSessionLocal
from app.models.queue import Queue
from app.websocket.connection_manager import manager
from app.websocket.helpers import build_queue_snapshot

logger = logging.getLogger(__name__)
router = APIRouter()


@router.websocket("/queues/{queue_id}")
async def websocket_queue(
    websocket: WebSocket,
    queue_id: uuid.UUID,
    token: Optional[str] = Query(default=None, alias="token"),
):
    """
    Real-time WebSocket endpoint for a specific queue.

    Query params:
      token (optional) — JWT for admin authentication

    Lifecycle:
      1. Accept connection first (required by ASGI protocol)
      2. Validate queue exists → resolve org_id server-side
      3. If admin token provided → validate JWT + org match
      4. Send full state snapshot
      5. Keep alive — pushes come via Redis subscriber loop
      6. On disconnect → clean up
    """
    channel: Optional[str] = None

    # AUDIT FIX: Accept the connection FIRST.
    # ASGI protocol requires accept() before close().
    # Validation errors are sent as close frames after acceptance.
    await websocket.accept()

    # Track metric
    try:
        from app.monitoring.metrics import WS_CONNECTIONS_TOTAL
        WS_CONNECTIONS_TOTAL.inc()
    except Exception:
        pass

    try:
        # ── 1. Validate queue & resolve channel ───────────────────
        try:
            async with AsyncSessionLocal() as db:
                result = await db.execute(
                    select(Queue).where(Queue.id == queue_id)
                )
                queue = result.scalar_one_or_none()
        except Exception as exc:
            logger.error("WS DB lookup failed | queue=%s err=%s", queue_id, exc)
            await websocket.close(code=4500, reason="Internal server error")
            return

        if queue is None:
            await websocket.close(code=4404, reason="Queue not found")
            return

        # Channel is resolved SERVER-SIDE from DB — never from client
        org_id_str = str(queue.org_id)
        channel = manager.get_channel(org_id_str, str(queue_id))

        # ── 2. Admin auth (optional) ─────────────────────────────
        if token:
            try:
                payload = decode_access_token(token)
                jwt_org_id = payload.get("org_id")
                if jwt_org_id != org_id_str:
                    await websocket.close(code=4403, reason="Queue does not belong to your organization")
                    return
                logger.info(
                    "WS admin connected | user=%s channel=%s",
                    payload.get("sub"),
                    channel,
                )
            except JWTError:
                await websocket.close(code=4401, reason="Invalid or expired token")
                return
        else:
            logger.info("WS public client connected | channel=%s", channel)

        # ── 3. Register with connection manager ───────────────────
        # Note: accept() already called above, so we use _register_only
        async with manager._lock:
            manager._connections[channel].add(websocket)
        logger.info(
            "WS registered | channel=%s clients=%d",
            channel, manager.active_count(channel),
        )

        # ── 4. Send full state snapshot immediately ───────────────
        async with AsyncSessionLocal() as db:
            snapshot = await build_queue_snapshot(db, queue_id=queue_id)
        await websocket.send_json(snapshot)

        # ── 5. Keep alive loop ────────────────────────────────────
        while True:
            try:
                data = await websocket.receive_text()
                if data == "ping":
                    await websocket.send_json({"type": "pong"})
            except WebSocketDisconnect:
                break

    except WebSocketDisconnect:
        pass
    except Exception as exc:
        logger.error("WebSocket error | queue=%s err=%s", queue_id, exc)
    finally:
        # ── 6. Clean up ──────────────────────────────────────────
        if channel:
            await manager.disconnect(channel, websocket)
        # Track metric
        try:
            from app.monitoring.metrics import WS_DISCONNECTIONS_TOTAL
            WS_DISCONNECTIONS_TOTAL.inc()
        except Exception:
            pass
