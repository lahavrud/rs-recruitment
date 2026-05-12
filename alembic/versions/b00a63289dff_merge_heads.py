"""merge heads

Revision ID: b00a63289dff
Revises: a7f9c3d2b1e5, a7f9c3e1d2b4
Create Date: 2026-05-11 23:39:42.068956

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b00a63289dff'
down_revision: Union[str, Sequence[str], None] = ('a7f9c3d2b1e5', 'a7f9c3e1d2b4')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
