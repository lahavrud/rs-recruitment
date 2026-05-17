"""lowercase_user_emails

Revision ID: 79bfb205c6bb
Revises: c57f61e2f435
Create Date: 2026-05-17 19:30:23.855542

Backfills all User.email values to lowercase so the application-level
normalization (email.lower().strip()) stays consistent with stored data.

Pre-flight: aborts if any two rows produce the same lower(email), so an
operator can resolve collisions manually before the migration runs.
"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

revision: str = "79bfb205c6bb"
down_revision: Union[str, Sequence[str], None] = "c57f61e2f435"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    # Pre-flight: detect case-insensitive duplicates before touching anything.
    dupes = conn.execute(
        sa.text(
            """
            SELECT lower(email), count(*)
            FROM "user"
            GROUP BY lower(email)
            HAVING count(*) > 1
            """
        )
    ).fetchall()
    if dupes:
        pairs = ", ".join(f"{row[0]!r} ({row[1]} rows)" for row in dupes)
        raise RuntimeError(
            f"Cannot backfill: case-insensitive duplicate emails exist: {pairs}. "
            "Resolve manually before re-running this migration."
        )

    conn.execute(sa.text('UPDATE "user" SET email = lower(email)'))


def downgrade() -> None:
    # Lowercasing is a lossy operation — original casing cannot be restored.
    pass
