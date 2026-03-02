"""
app/api/v1/router.py
Top-level v1 API router — register all endpoint routers here.
"""
from fastapi import APIRouter
from app.api.v1.endpoints import health, auth, users, queues, tokens, internal

api_router = APIRouter()

# ── Health ─────────────────────────────────────────────────────────
api_router.include_router(health.router, prefix="", tags=["Health"])

# ── Authentication ─────────────────────────────────────────────────
api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])

# ── Users ──────────────────────────────────────────────────────────
api_router.include_router(users.router, prefix="/users", tags=["Users"])

# ── Queues ─────────────────────────────────────────────────────────
api_router.include_router(queues.router, prefix="/queues", tags=["Queues"])

# ── Tokens ─────────────────────────────────────────────────────────
api_router.include_router(tokens.router, prefix="/tokens", tags=["Tokens"])

# ── Internal (Super Admin) ─────────────────────────────────────────
api_router.include_router(internal.router, prefix="/internal", tags=["Internal"])
