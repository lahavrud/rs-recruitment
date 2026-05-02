"""add invite_tokens table

Revision ID: a1b2c3d4e5f6
Revises: 3d454225bd45
Create Date: 2026-05-02 14:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, Sequence[str], None] = "3d454225bd45"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "invitetoken",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("token", sa.String(), nullable=False),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("company_name", sa.String(), nullable=True),
        sa.Column("contact_first_name", sa.String(), nullable=True),
        sa.Column("contact_last_name", sa.String(), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column(
            "status",
            sa.Enum("pending", "used", "expired", "revoked", name="invitetokenstatus"),
            nullable=False,
        ),
        sa.Column("created_by_admin_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["created_by_admin_id"], ["user.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_invitetoken_token"), "invitetoken", ["token"], unique=True)
    op.create_index(
        op.f("ix_invitetoken_created_by_admin_id"),
        "invitetoken",
        ["created_by_admin_id"],
        unique=False,
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f("ix_invitetoken_created_by_admin_id"), table_name="invitetoken")
    op.drop_index(op.f("ix_invitetoken_token"), table_name="invitetoken")
    op.drop_table("invitetoken")
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute("DROP TYPE IF EXISTS invitetokenstatus")
