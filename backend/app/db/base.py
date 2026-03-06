"""
app/db/base.py
Consolidated metadata for all models.
All models MUST be imported here so Alembic autogenerate can detect them.
"""
from app.db.base_class import Base  # noqa: F401


# ── Register all models (Alembic autogenerate requires these imports) ──────────
from app.models.organization import Organization  # noqa: E402, F401
from app.models.user import User                  # noqa: E402, F401
from app.models.queue import Queue                # noqa: E402, F401
from app.models.token import Token                # noqa: E402, F401
from app.audit.models import AuditLog             # noqa: E402, F401
