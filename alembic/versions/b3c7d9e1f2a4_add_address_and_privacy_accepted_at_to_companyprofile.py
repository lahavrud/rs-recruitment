"""add address and privacy_accepted_at to companyprofile

Revision ID: b3c7d9e1f2a4
Revises: a1b2c3d4e5f6
Create Date: 2026-05-04 00:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "b3c7d9e1f2a4"
down_revision: Union[str, Sequence[str], None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "companyprofile",
        sa.Column("address", sa.Text(), nullable=True),
    )
    op.add_column(
        "companyprofile",
        sa.Column("privacy_accepted_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("companyprofile", "privacy_accepted_at")
    op.drop_column("companyprofile", "address")
