"""Add index on Application.status

Revision ID: 3f16caf9b5de
Revises: ce657d1f111d
Create Date: 2026-01-17 22:42:47.209242

"""

from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "3f16caf9b5de"
down_revision: Union[str, Sequence[str], None] = "ce657d1f111d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create index on Application.status for optimized admin dashboard queries
    op.create_index(
        "ix_application_status",
        "application",
        ["status"],
        unique=False,
    )


def downgrade() -> None:
    """Downgrade schema."""
    # Drop index on Application.status
    op.drop_index("ix_application_status", table_name="application")
