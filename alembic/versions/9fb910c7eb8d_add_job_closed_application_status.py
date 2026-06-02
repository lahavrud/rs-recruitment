"""add_job_closed_application_status

Revision ID: 9fb910c7eb8d
Revises: 5f57f1a7cc38
Create Date: 2026-06-02 19:20:36.294157

Adds JOB_CLOSED to the applicationstatus Postgres enum.
This status is set automatically on all NEW / APPROVED_BY_ADMIN
applications when the parent job is closed by an admin.

SQLite (test path): the column is plain TEXT — no DDL needed.
"""

from typing import Sequence, Union

from sqlalchemy import text

from alembic import op

revision: str = "9fb910c7eb8d"
down_revision: Union[str, Sequence[str], None] = "5f57f1a7cc38"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_NEW_VALUE = "JOB_CLOSED"
_ENUM_NAME = "applicationstatus"


def _label_exists(bind, label: str) -> bool:
    return (
        bind.execute(
            text(
                "SELECT 1 FROM pg_enum e "
                "JOIN pg_type t ON e.enumtypid = t.oid "
                "WHERE t.typname = :enum AND e.enumlabel = :label"
            ),
            {"enum": _ENUM_NAME, "label": label},
        ).scalar()
        is not None
    )


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return
    if not _label_exists(bind, _NEW_VALUE):
        op.execute(f"ALTER TYPE {_ENUM_NAME} ADD VALUE '{_NEW_VALUE}'")


def downgrade() -> None:
    # Postgres does not support removing enum values without recreating the
    # type. A best-effort no-op is the least surprising behaviour here; if
    # rollback is required, migrate data off JOB_CLOSED first.
    pass
