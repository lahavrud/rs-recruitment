"""job fields overhaul

Revision ID: a7f9c3e1d2b4
Revises: e7f3a2b1c8d4
Create Date: 2026-05-11 13:00:00.000000

Adds short_description (required, 140 chars), tags (JSONB array), and
is_featured (bool) to job. Changes requirements from TEXT to JSONB list and
wipes existing data — published jobs stay published but show an empty
requirements section until re-filled via the admin/company forms.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

from alembic import op

revision: str = "a7f9c3e1d2b4"
down_revision: str | Sequence[str] | None = "e7f3a2b1c8d4"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "job",
        sa.Column(
            "short_description",
            sa.String(length=140),
            nullable=False,
            server_default="",
        ),
    )
    op.add_column(
        "job",
        sa.Column(
            "tags",
            JSONB(),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
    )
    op.add_column(
        "job",
        sa.Column(
            "is_featured",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )
    op.create_index(
        op.f("ix_job_is_featured"),
        "job",
        ["is_featured"],
        unique=False,
    )

    # Wipe requirements and switch column type to JSONB. PUBLISHED jobs stay
    # PUBLISHED; their detail page will show an empty requirements section
    # until an admin / the owning company re-fills the field.
    op.execute("UPDATE job SET requirements = '[]'")
    op.alter_column(
        "job",
        "requirements",
        existing_type=sa.Text(),
        type_=JSONB(),
        existing_nullable=False,
        postgresql_using="requirements::jsonb",
        server_default=sa.text("'[]'::jsonb"),
    )


def downgrade() -> None:
    op.alter_column(
        "job",
        "requirements",
        existing_type=JSONB(),
        type_=sa.Text(),
        existing_nullable=False,
        postgresql_using="requirements::text",
        server_default=None,
    )
    op.drop_index(op.f("ix_job_is_featured"), table_name="job")
    op.drop_column("job", "is_featured")
    op.drop_column("job", "tags")
    op.drop_column("job", "short_description")
