"""Add contact_email to companyprofile

Revision ID: d3e7f2a1b8c9
Revises: c4d2a8f1e9b7
Create Date: 2026-05-12 16:55:00.000000

Adds a required `contact_email` column to companyprofile. Admins capture
this when creating an orphan (no-user-yet) profile via the direct-create
flow; self-registered companies inherit it from their user account in the
application layer.

Existing rows are backfilled:
  - Attached profiles (user_id IS NOT NULL): contact_email = user.email
  - Orphan profiles (user_id IS NULL): contact_email = unreachable placeholder
The placeholder is intentionally an unreachable address so any accidental
send-attempt fails loudly; admins must edit orphans to fill in the real one.
"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

revision: str = "d3e7f2a1b8c9"
down_revision: Union[str, Sequence[str], None] = "c4d2a8f1e9b7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


_ORPHAN_PLACEHOLDER = "unknown@rs-recruiting.local"


def upgrade() -> None:
    bind = op.get_bind()
    dialect = bind.dialect.name

    # 1. Add column as NULL-allowed so the backfill can run.
    op.add_column(
        "companyprofile",
        sa.Column("contact_email", sa.String(length=255), nullable=True),
    )

    # 2. Backfill attached profiles from user.email.
    if dialect == "postgresql":
        op.execute(
            sa.text(
                'UPDATE companyprofile SET contact_email = "user".email '
                'FROM "user" '
                'WHERE companyprofile.user_id = "user".id '
                "AND companyprofile.contact_email IS NULL"
            )
        )
    else:
        # SQLite-friendly correlated subquery — only used by the test bootstrap
        # path; production is postgres.
        op.execute(
            sa.text(
                "UPDATE companyprofile SET contact_email = ("
                "SELECT email FROM user "
                "WHERE user.id = companyprofile.user_id) "
                "WHERE user_id IS NOT NULL AND contact_email IS NULL"
            )
        )

    # 3. Backfill orphan profiles with an unreachable placeholder.
    op.execute(
        sa.text(
            "UPDATE companyprofile SET contact_email = :placeholder "
            "WHERE contact_email IS NULL"
        ).bindparams(placeholder=_ORPHAN_PLACEHOLDER)
    )

    # 4. Tighten to NOT NULL + add the index that matches the model.
    op.alter_column("companyprofile", "contact_email", nullable=False)
    op.create_index(
        op.f("ix_companyprofile_contact_email"),
        "companyprofile",
        ["contact_email"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_companyprofile_contact_email"), table_name="companyprofile")
    op.drop_column("companyprofile", "contact_email")
