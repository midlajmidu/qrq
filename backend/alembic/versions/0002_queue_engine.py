"""
Alembic migration — adds queues and tokens tables.

Revision ID: 0002
Depends on: 0001_initial_schema
"""
from typing import Sequence, Union
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from alembic import op

revision: str = "0002_queue_engine"
down_revision: Union[str, None] = "0001_initial_schema"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── Token status enum ─────────────────────────────────────────
    op.execute(
        "CREATE TYPE tokenstatus AS ENUM ('waiting','serving','done','skipped')"
    )

    # ── queues ────────────────────────────────────────────────────
    op.create_table(
        "queues",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("org_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(150), nullable=False),
        sa.Column("prefix", sa.String(10), nullable=False, server_default="A"),
        sa.Column("current_token_number", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name", "org_id", name="uq_queue_name_org"),
    )
    op.create_index("ix_queues_org_id", "queues", ["org_id"])

    # ── tokens ────────────────────────────────────────────────────
    op.create_table(
        "tokens",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("org_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("queue_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("token_number", sa.Integer(), nullable=False),
        sa.Column(
            "status",
            postgresql.ENUM(
                "waiting", "serving", "done", "skipped",
                name="tokenstatus", create_type=False
            ),
            nullable=False,
            server_default="waiting",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("served_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["org_id"],   ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["queue_id"], ["queues.id"],         ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("queue_id", "token_number", name="uq_token_queue_number"),
    )
    op.create_index("ix_tokens_org_id",         "tokens", ["org_id"])
    op.create_index("ix_tokens_queue_id",        "tokens", ["queue_id"])
    op.create_index("ix_tokens_queue_status",    "tokens", ["queue_id", "status"])
    op.create_index("ix_tokens_queue_number",    "tokens", ["queue_id", "token_number"])


def downgrade() -> None:
    op.drop_index("ix_tokens_queue_number",  table_name="tokens")
    op.drop_index("ix_tokens_queue_status",  table_name="tokens")
    op.drop_index("ix_tokens_queue_id",      table_name="tokens")
    op.drop_index("ix_tokens_org_id",        table_name="tokens")
    op.drop_table("tokens")
    op.drop_index("ix_queues_org_id", table_name="queues")
    op.drop_table("queues")
    op.execute("DROP TYPE tokenstatus")
