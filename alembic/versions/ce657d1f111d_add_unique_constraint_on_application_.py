"""Add unique constraint on Application (job_id, candidate_id)

Revision ID: ce657d1f111d
Revises: e2dcba4df8fb
Create Date: 2026-01-17 22:24:28.818802

"""

from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "ce657d1f111d"
down_revision: Union[str, Sequence[str], None] = "e2dcba4df8fb"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Check if using SQLite (requires batch mode for constraints)
    # Get connection from context (works with async migrations)
    connection = op.get_bind()
    is_sqlite = connection.dialect.name == "sqlite"

    if is_sqlite:
        # Use batch mode for SQLite (copy-and-move strategy)
        with op.batch_alter_table("application", schema=None) as batch_op:
            batch_op.create_unique_constraint(
                "uq_application_job_candidate", ["job_id", "candidate_id"]
            )
    else:
        # Use standard mode for PostgreSQL and other databases
        op.create_unique_constraint(
            "uq_application_job_candidate", "application", ["job_id", "candidate_id"]
        )


def downgrade() -> None:
    """Downgrade schema."""
    # Check if using SQLite (requires batch mode for constraints)
    connection = op.get_bind()
    is_sqlite = connection.dialect.name == "sqlite"

    if is_sqlite:
        # Use batch mode for SQLite
        with op.batch_alter_table("application", schema=None) as batch_op:
            batch_op.drop_constraint("uq_application_job_candidate", type_="unique")
    else:
        # Use standard mode for PostgreSQL and other databases
        op.drop_constraint(
            "uq_application_job_candidate", "application", type_="unique"
        )
