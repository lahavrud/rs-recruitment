"""add_composite_index_application_job_status

Revision ID: 6484c273cd57
Revises: 175fb94581a1
Create Date: 2026-05-07 23:05:07.375643

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6484c273cd57'
down_revision: Union[str, Sequence[str], None] = '175fb94581a1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index(
        "ix_application_job_status",
        "application",
        ["job_id", "status"],
    )


def downgrade() -> None:
    op.drop_index("ix_application_job_status", table_name="application")
