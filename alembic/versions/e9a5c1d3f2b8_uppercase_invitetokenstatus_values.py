"""UPPERCASE InviteTokenStatus enum values

Revision ID: e9a5c1d3f2b8
Revises: d3e7f2a1b8c9
Create Date: 2026-05-15 09:00:00.000000

Brings InviteTokenStatus in line with every other enum in src/enums.py
(UserRole, JobStatus, ApplicationStatus) which all use UPPERCASE values.
The lowercase outlier risked silent mismatches when comparing string
columns and was inconsistent in API responses.

The migration is idempotent: dev DBs bootstrapped via SQLModel.create_all
already have the Postgres labels stored as the enum *names* (UPPERCASE),
because SQLAlchemy's native ENUM defaults to `.name`. Production, if
built strictly via the original lowercase migration, would have lowercase
labels. The label-existence check below covers both cases.

SQLite (test path): the column is plain TEXT, so there is nothing to
rename — the in-Python enum change is enough.
"""

from typing import Sequence, Union

from sqlalchemy import text

from alembic import op

revision: str = "e9a5c1d3f2b8"
down_revision: Union[str, Sequence[str], None] = "d3e7f2a1b8c9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


_RENAMES = [
    ("pending", "PENDING"),
    ("used", "USED"),
    ("expired", "EXPIRED"),
    ("revoked", "REVOKED"),
]


def _label_exists(bind, label: str) -> bool:
    return (
        bind.execute(
            text(
                "SELECT 1 FROM pg_enum e "
                "JOIN pg_type t ON e.enumtypid = t.oid "
                "WHERE t.typname = 'invitetokenstatus' AND e.enumlabel = :l"
            ),
            {"l": label},
        ).scalar()
        is not None
    )


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return
    for old, new in _RENAMES:
        if _label_exists(bind, old):
            op.execute(f"ALTER TYPE invitetokenstatus RENAME VALUE '{old}' TO '{new}'")


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return
    for old, new in _RENAMES:
        if _label_exists(bind, new):
            op.execute(f"ALTER TYPE invitetokenstatus RENAME VALUE '{new}' TO '{old}'")
