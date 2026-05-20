"""data_export_request

Revision ID: e05ba7c8b4ac
Revises: 8dbec9f8ada3
Create Date: 2026-05-20 15:55:28.517485

Sprint 11 / issue #608: candidate GDPR data export.

Adds the ``data_export_request`` table that backs the signed download URL
emailed to candidates after their export ZIP is assembled. One row per
request; the raw token lives only in the email URL; ``token_hash`` is
SHA-256 of the raw token. Cleanup of expired / used rows lands in the
nightly cron (#10).
"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

revision: str = "e05ba7c8b4ac"
down_revision: Union[str, Sequence[str], None] = "8dbec9f8ada3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    op.create_table(
        "data_export_request",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("token_hash", sa.String(), nullable=False),
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("download_path", sa.Text(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index(
        "ix_data_export_request_token_hash",
        "data_export_request",
        ["token_hash"],
        unique=True,
    )
    op.create_index(
        "ix_data_export_request_user_id",
        "data_export_request",
        ["user_id"],
        unique=False,
    )


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    op.drop_index("ix_data_export_request_user_id", table_name="data_export_request")
    op.drop_index("ix_data_export_request_token_hash", table_name="data_export_request")
    op.drop_table("data_export_request")
