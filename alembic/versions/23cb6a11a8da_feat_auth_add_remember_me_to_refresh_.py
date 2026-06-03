"""feat(auth): add remember_me to refresh_tokens

Revision ID: 23cb6a11a8da
Revises: e03b8aa073a3
Create Date: 2026-06-03 16:33:15.947731

"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "23cb6a11a8da"
down_revision: Union[str, Sequence[str], None] = "e03b8aa073a3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "refreshtoken",
        sa.Column(
            "remember_me", sa.Boolean(), nullable=False, server_default=sa.false()
        ),
    )


def downgrade() -> None:
    op.drop_column("refreshtoken", "remember_me")
