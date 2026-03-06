"""Make org_id nullable for super_admin

Revision ID: 5b246e967260
Revises: 0003_audit_trail
Create Date: 2026-03-02 20:39:46.532337

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '5b246e967260'
down_revision: Union[str, None] = '0003_audit_trail'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column('users', 'org_id',
               existing_type=sa.UUID(),
               nullable=True)


def downgrade() -> None:
    # Delete super_admin users before restoring NOT NULL constraint
    op.execute("DELETE FROM users WHERE org_id IS NULL")
    op.alter_column('users', 'org_id',
               existing_type=sa.UUID(),
               nullable=False)
