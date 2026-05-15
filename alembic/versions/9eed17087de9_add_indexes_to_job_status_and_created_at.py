"""add indexes to job status and created_at

Revision ID: 9eed17087de9
Revises: f1a2b3c4d5e6
Create Date: 2026-05-15 12:00:00.000000

Adds indexes on job.status and job.created_at to eliminate full table
scans on the public job board query: WHERE status = 'PUBLISHED'
ORDER BY is_featured DESC, created_at DESC.
"""

from alembic import op

revision = "9eed17087de9"
down_revision = "f1a2b3c4d5e6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index("ix_job_status", "job", ["status"])
    op.create_index("ix_job_created_at", "job", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_job_created_at", table_name="job")
    op.drop_index("ix_job_status", table_name="job")
