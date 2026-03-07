"""add session_id to queues and tokens

Revision ID: c9d1e2f3a4b5
Revises: b6c695e57984
Create Date: 2026-03-07 06:30:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "c9d1e2f3a4b5"
down_revision: Union[str, None] = "b6c695e57984"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── 1. Add session_id to queues (nullable first, then backfill, then NOT NULL) ──
    op.add_column(
        "queues",
        sa.Column("session_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    # Backfill: every existing queue gets its own fresh session UUID
    op.execute("UPDATE queues SET session_id = gen_random_uuid() WHERE session_id IS NULL")
    op.alter_column("queues", "session_id", nullable=False)
    op.create_index("ix_queues_session_id", "queues", ["session_id"])

    # ── 2. Add session_id to tokens (nullable first, then backfill from queue, then NOT NULL) ──
    op.add_column(
        "tokens",
        sa.Column("session_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    # Backfill: inherit session_id from the parent queue row
    op.execute(
        """
        UPDATE tokens t
        SET session_id = q.session_id
        FROM queues q
        WHERE t.queue_id = q.id
          AND t.session_id IS NULL
        """
    )
    op.alter_column("tokens", "session_id", nullable=False)
    op.create_index("ix_tokens_session_id", "tokens", ["session_id"])


def downgrade() -> None:
    op.drop_index("ix_tokens_session_id", table_name="tokens")
    op.drop_column("tokens", "session_id")
    op.drop_index("ix_queues_session_id", table_name="queues")
    op.drop_column("queues", "session_id")
