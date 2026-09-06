"""Add call_status and ring_duration_seconds to call_logs

Revision ID: z008_call_status_ring_duration
Revises: z007_session_flags
Create Date: 2026-09-04 16:55:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'z008_call_status_ring_duration'
down_revision = 'z007_session_flags'
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_columns = [col['name'] for col in inspector.get_columns('call_logs')]

    if 'call_status' not in existing_columns:
        op.add_column('call_logs', sa.Column('call_status', sa.String(20), server_default='completed', nullable=False))
    if 'ring_duration_seconds' not in existing_columns:
        op.add_column('call_logs', sa.Column('ring_duration_seconds', sa.Integer(), server_default='0', nullable=False))


def downgrade() -> None:
    op.drop_column('call_logs', 'ring_duration_seconds')
    op.drop_column('call_logs', 'call_status')
