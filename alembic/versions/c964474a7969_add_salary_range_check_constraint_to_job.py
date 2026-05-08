"""add salary range check constraint to job

Revision ID: c964474a7969
Revises: f205788dce0e
Create Date: 2026-05-09 01:18:27.486102

"""

from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "c964474a7969"
down_revision: Union[str, Sequence[str], None] = "f205788dce0e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_check_constraint(
        "ck_job_salary_range",
        "job",
        "salary_min IS NULL OR salary_max IS NULL OR salary_min <= salary_max",
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint("ck_job_salary_range", "job", type_="check")
