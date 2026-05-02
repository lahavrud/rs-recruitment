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
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        # Use raw SQL so SQLAlchemy never auto-emits CREATE TYPE.
        # IF NOT EXISTS guards make every statement idempotent.
        op.execute(
            """
            DO $$ BEGIN
                CREATE TYPE invitetokenstatus
                    AS ENUM ('pending', 'used', 'expired', 'revoked');
            EXCEPTION
                WHEN duplicate_object THEN NULL;
            END $$;
            """
        )
        op.execute(
            """
            CREATE TABLE IF NOT EXISTS invitetoken (
                id                  SERIAL PRIMARY KEY,
                token               VARCHAR     NOT NULL,
                email               VARCHAR     NOT NULL,
                company_name        VARCHAR,
                contact_first_name  VARCHAR,
                contact_last_name   VARCHAR,
                note                TEXT,
                status              invitetokenstatus NOT NULL,
                created_by_admin_id INTEGER     NOT NULL
                    REFERENCES "user"(id),
                created_at          TIMESTAMPTZ NOT NULL,
                expires_at          TIMESTAMPTZ NOT NULL,
                used_at             TIMESTAMPTZ
            )
            """
        )
        op.execute(
            "CREATE UNIQUE INDEX IF NOT EXISTS ix_invitetoken_token"
            " ON invitetoken (token)"
        )
        op.execute(
            "CREATE INDEX IF NOT EXISTS ix_invitetoken_created_by_admin_id"
            " ON invitetoken (created_by_admin_id)"
        )
    else:
        # SQLite path used in tests — no CREATE TYPE support
        op.create_table(
            "invitetoken",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("token", sa.String(), nullable=False),
            sa.Column("email", sa.String(), nullable=False),
            sa.Column("company_name", sa.String(), nullable=True),
            sa.Column("contact_first_name", sa.String(), nullable=True),
            sa.Column("contact_last_name", sa.String(), nullable=True),
            sa.Column("note", sa.Text(), nullable=True),
            sa.Column("status", sa.String(), nullable=False),
            sa.Column("created_by_admin_id", sa.Integer(), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(["created_by_admin_id"], ["user.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(
            op.f("ix_invitetoken_token"), "invitetoken", ["token"], unique=True
        )
        op.create_index(
            op.f("ix_invitetoken_created_by_admin_id"),
            "invitetoken",
            ["created_by_admin_id"],
            unique=False,
        )


def downgrade() -> None:
    """Downgrade schema."""
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute("DROP TABLE IF EXISTS invitetoken")
        op.execute("DROP TYPE IF EXISTS invitetokenstatus")
    else:
        op.drop_index(
            op.f("ix_invitetoken_created_by_admin_id"), table_name="invitetoken"
        )
        op.drop_index(op.f("ix_invitetoken_token"), table_name="invitetoken")
        op.drop_table("invitetoken")
