"""add indexes to job status and created_at

Revision ID: a1b2c3d4e5f6
Revises: f205788dce0e
Create Date: 2026-05-15 12:00:00.000000

Adds indexes on job.status and job.created_at to eliminate full table
scans on the public job board query: WHERE status = 'PUBLISHED'
ORDER BY is_featured DESC, created_at DESC.
"""

from alembic import op

revision = "a1b2c3d4e5f6"
down_revision = "f205788dce0e"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index("ix_job_status", "job", ["status"])
    op.create_index("ix_job_created_at", "job", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_job_created_at", table_name="job")
    op.drop_index("ix_job_status", table_name="job")
