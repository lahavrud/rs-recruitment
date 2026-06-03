"""add_email_quota_table

Revision ID: e03b8aa073a3
Revises: 9fb910c7eb8d
Create Date: 2026-06-02 23:26:40.068883

"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "e03b8aa073a3"
down_revision: Union[str, Sequence[str], None] = "9fb910c7eb8d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "email_quota",
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("count", sa.Integer(), nullable=False, server_default="0"),
        sa.PrimaryKeyConstraint("date"),
    )


def downgrade() -> None:
    op.drop_table("email_quota")
