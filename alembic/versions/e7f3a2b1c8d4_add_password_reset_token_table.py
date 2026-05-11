"""add passwordresettoken table

Revision ID: e7f3a2b1c8d4
Revises: d8a1c2e4f7b9
Create Date: 2026-05-11 12:00:00.000000

Self-service password reset (see issue #363). One row per outstanding reset
request. `token_hash` stores SHA-256 of the raw token mailed to the user;
DB never holds the raw secret.
"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

revision: str = "e7f3a2b1c8d4"
down_revision: Union[str, Sequence[str], None] = "d8a1c2e4f7b9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute(
            """
            CREATE TABLE IF NOT EXISTS passwordresettoken (
                id          SERIAL PRIMARY KEY,
                token_hash  VARCHAR     NOT NULL,
                user_id     INTEGER     NOT NULL REFERENCES "user"(id),
                expires_at  TIMESTAMPTZ NOT NULL,
                used        BOOLEAN     NOT NULL DEFAULT FALSE,
                created_at  TIMESTAMPTZ NOT NULL
            )
            """
        )
        op.execute(
            "CREATE UNIQUE INDEX IF NOT EXISTS ix_passwordresettoken_token_hash"
            " ON passwordresettoken (token_hash)"
        )
        op.execute(
            "CREATE INDEX IF NOT EXISTS ix_passwordresettoken_user_id"
            " ON passwordresettoken (user_id)"
        )
    else:
        op.create_table(
            "passwordresettoken",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("token_hash", sa.String(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("used", sa.Boolean(), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(["user_id"], ["user.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(
            op.f("ix_passwordresettoken_token_hash"),
            "passwordresettoken",
            ["token_hash"],
            unique=True,
        )
        op.create_index(
            op.f("ix_passwordresettoken_user_id"),
            "passwordresettoken",
            ["user_id"],
            unique=False,
        )


def downgrade() -> None:
    """Downgrade schema."""
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute("DROP TABLE IF EXISTS passwordresettoken")
    else:
        op.drop_index(
            op.f("ix_passwordresettoken_user_id"), table_name="passwordresettoken"
        )
        op.drop_index(
            op.f("ix_passwordresettoken_token_hash"),
            table_name="passwordresettoken",
        )
        op.drop_table("passwordresettoken")
