"""rename_activation_token_user_id_and_add_consent

Revision ID: 8dbec9f8ada3
Revises: fb9f578fac9d
Create Date: 2026-05-20 14:40:04.189620

Sprint 11 / issue #605: candidate registration reuses the existing
`activationtoken` table, so its FK column is no longer company-specific.

- Renames `activationtoken.company_user_id` → `activationtoken.user_id`
  (FK to `user.id` ON DELETE CASCADE, indexed). Renames the index as well
  for clarity.
- Adds nullable `activationtoken.consent_policy_version` to lock the
  policy version a candidate agreed to at registration time (NULL for
  company tokens — consent is captured on CompanyProfile in the company
  flow).

PG-only; SQLite test path uses `SQLModel.metadata.create_all` against
the up-to-date model.
"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "8dbec9f8ada3"
down_revision: Union[str, Sequence[str], None] = "fb9f578fac9d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    op.alter_column(
        "activationtoken",
        "company_user_id",
        new_column_name="user_id",
    )
    op.execute(
        "ALTER INDEX IF EXISTS ix_activationtoken_company_user_id "
        "RENAME TO ix_activationtoken_user_id"
    )

    op.add_column(
        "activationtoken",
        sa.Column("consent_policy_version", sa.String(length=20), nullable=True),
    )


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    op.drop_column("activationtoken", "consent_policy_version")

    op.execute(
        "ALTER INDEX IF EXISTS ix_activationtoken_user_id "
        "RENAME TO ix_activationtoken_company_user_id"
    )
    op.alter_column(
        "activationtoken",
        "user_id",
        new_column_name="company_user_id",
    )
