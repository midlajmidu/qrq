"""add_sessions_table

Revision ID: 7eee8683fe2a
Revises: 96fdb9e3979e
Create Date: 2026-03-09 13:53:39.723415

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '7eee8683fe2a'
down_revision: Union[str, None] = '96fdb9e3979e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create sessions table
    op.create_table('sessions',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('org_id', sa.UUID(), nullable=False),
        sa.Column('session_date', sa.Date(), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=True),
        sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['org_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('org_id', 'session_date', name='uq_session_org_date')
    )
    op.create_index(op.f('ix_sessions_org_id'), 'sessions', ['org_id'], unique=False)

    # 2. On queues: drop day_id FK and column first (before dropping days table)
    op.drop_constraint('queues_day_id_fkey', 'queues', type_='foreignkey')
    op.drop_index('ix_queues_day_id', table_name='queues')
    op.drop_column('queues', 'day_id')

    # 3. Now safe to drop days table
    op.drop_index('ix_days_org_id', table_name='days')
    op.drop_table('days')

    # 4. Add token_session_id column (copy existing session_id values)
    op.add_column('queues', sa.Column('token_session_id', sa.UUID(), nullable=True))
    op.execute("UPDATE queues SET token_session_id = session_id")
    op.alter_column('queues', 'token_session_id', nullable=False)
    op.create_index(op.f('ix_queues_token_session_id'), 'queues', ['token_session_id'], unique=False)

    # 5. Make session_id nullable first, then clear old values, then add FK to sessions
    op.alter_column('queues', 'session_id', existing_type=sa.UUID(), nullable=True)
    op.execute("UPDATE queues SET session_id = NULL")
    op.create_foreign_key('queues_session_id_fkey', 'queues', 'sessions', ['session_id'], ['id'], ondelete='CASCADE')


def downgrade() -> None:
    # Drop session FK
    op.drop_constraint('queues_session_id_fkey', 'queues', type_='foreignkey')
    # Restore session_id from token_session_id
    op.execute("UPDATE queues SET session_id = token_session_id WHERE session_id IS NULL")
    op.alter_column('queues', 'session_id', existing_type=sa.UUID(), nullable=False)

    # Drop token_session_id
    op.drop_index(op.f('ix_queues_token_session_id'), table_name='queues')
    op.drop_column('queues', 'token_session_id')

    # Recreate days table
    op.create_table('days',
        sa.Column('id', sa.UUID(), autoincrement=False, nullable=False),
        sa.Column('org_id', sa.UUID(), autoincrement=False, nullable=False),
        sa.Column('name', sa.VARCHAR(length=100), autoincrement=False, nullable=False),
        sa.Column('date', postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=False),
        sa.Column('is_active', sa.BOOLEAN(), autoincrement=False, nullable=False),
        sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), autoincrement=False, nullable=False),
        sa.ForeignKeyConstraint(['org_id'], ['organizations.id'], name='days_org_id_fkey', ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id', name='days_pkey')
    )
    op.create_index('ix_days_org_id', 'days', ['org_id'], unique=False)

    # Restore day_id column
    op.add_column('queues', sa.Column('day_id', sa.UUID(), autoincrement=False, nullable=True))
    op.create_index('ix_queues_day_id', 'queues', ['day_id'], unique=False)
    op.create_foreign_key('queues_day_id_fkey', 'queues', 'days', ['day_id'], ['id'], ondelete='CASCADE')

    # Drop sessions
    op.drop_index(op.f('ix_sessions_org_id'), table_name='sessions')
    op.drop_table('sessions')
