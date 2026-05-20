"""candidate_user_foundation

Revision ID: fb9f578fac9d
Revises: 79bfb205c6bb
Create Date: 2026-05-20 13:53:10.814887

Sprint 11 / issue #604 schema foundation for the candidate-user feature:

- Adds `CANDIDATE` to `userrole` enum.
- Adds `WITHDRAWN` to `applicationstatus` enum.
- Adds `candidateprofile.user_id` — nullable, UNIQUE, indexed, FK to
  `user.id` with `ON DELETE SET NULL` (so deleting a candidate User
  preserves the profile as a tombstone — see #611 deletion flow).
- Adds `application.resume_path` (nullable TEXT) — per-application
  snapshot of the resume submitted at apply time.
- Backfills `application.resume_path` from `candidateprofile.resume_path`
  so existing applications carry forward whatever resume was on the
  candidate's profile at migration time.
- Replaces the existing UNIQUE `(job_id, candidate_id)` constraint with
  a partial unique index `WHERE status != 'WITHDRAWN'` — candidates can
  re-apply to a job they previously withdrew from (#604 amendment).

Idempotent where possible: `ADD VALUE IF NOT EXISTS` on enums and
`DROP CONSTRAINT IF EXISTS` on the unique constraint. The enum
`ALTER TYPE ... ADD VALUE` is run inside an autocommit block so it
works on PostgreSQL < 12 (where ADD VALUE cannot be combined with
other statements in the same transaction).

PG-only: the SQLite test path uses `SQLModel.metadata.create_all` to
build the schema directly from `src/models.py`, so this migration is
a no-op there.
"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "fb9f578fac9d"
down_revision: Union[str, Sequence[str], None] = "79bfb205c6bb"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        # Tests build schema via SQLModel.metadata.create_all; this migration
        # is a no-op on non-Postgres backends.
        return

    # 1. Enum additions — must be outside a transaction block on PG < 12.
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'CANDIDATE'")
        op.execute("ALTER TYPE applicationstatus ADD VALUE IF NOT EXISTS 'WITHDRAWN'")

    # 2. candidateprofile.user_id — nullable, unique, indexed, FK SET NULL.
    op.add_column(
        "candidateprofile",
        sa.Column("user_id", sa.Integer(), nullable=True),
    )
    op.create_foreign_key(
        "candidateprofile_user_id_fkey",
        "candidateprofile",
        "user",
        ["user_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index(
        "ix_candidateprofile_user_id",
        "candidateprofile",
        ["user_id"],
        unique=True,
    )

    # 3. application.resume_path — per-application resume snapshot.
    op.add_column(
        "application",
        sa.Column("resume_path", sa.Text(), nullable=True),
    )

    # 4. Backfill application.resume_path from the candidate's profile resume.
    op.execute(
        """
        UPDATE application
           SET resume_path = candidateprofile.resume_path
          FROM candidateprofile
         WHERE candidateprofile.id = application.candidate_id
           AND candidateprofile.resume_path IS NOT NULL
        """
    )

    # 5. Replace the unique constraint with a partial unique index so
    #    WITHDRAWN applications don't block re-apply.
    op.execute(
        "ALTER TABLE application "
        'DROP CONSTRAINT IF EXISTS "uq_application_job_candidate"'
    )
    op.execute(
        "CREATE UNIQUE INDEX uq_application_job_candidate_active "
        "ON application (job_id, candidate_id) "
        "WHERE status != 'WITHDRAWN'"
    )


def downgrade() -> None:
    """Downgrade schema.

    Note: enum-value removals are intentionally NOT attempted. Postgres
    requires recreating the enum type to drop a value, which is invasive
    and risks data loss if any rows reference the removed label.
    """
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    op.execute("DROP INDEX IF EXISTS uq_application_job_candidate_active")
    op.create_unique_constraint(
        "uq_application_job_candidate",
        "application",
        ["job_id", "candidate_id"],
    )

    op.drop_column("application", "resume_path")

    op.drop_index("ix_candidateprofile_user_id", table_name="candidateprofile")
    op.drop_constraint(
        "candidateprofile_user_id_fkey", "candidateprofile", type_="foreignkey"
    )
    op.drop_column("candidateprofile", "user_id")
