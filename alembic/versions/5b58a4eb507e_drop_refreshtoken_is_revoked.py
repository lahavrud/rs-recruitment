"""drop refreshtoken.is_revoked

The application now deletes refresh-token rows on use / logout /
password change instead of marking them revoked (issue #641). The
column provided no security benefit (the code treated revoked and
missing rows identically — both raised ``InvalidCredentialsError``)
and rows accumulated forever with no cleanup path.

Revision ID: 5b58a4eb507e
Revises: 4cf71c223a38
Create Date: 2026-05-21 00:09:03.132042

"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "5b58a4eb507e"
down_revision: Union[str, Sequence[str], None] = "4cf71c223a38"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column("refreshtoken", "is_revoked")


def downgrade() -> None:
    # Restore the column with a NOT NULL constraint + ``False`` default
    # so any rows present after the upgrade get a valid value on rollback.
    op.add_column(
        "refreshtoken",
        sa.Column(
            "is_revoked",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )
    # Drop the server_default after the column is created so the model's
    # Python-side ``Field(default=False)`` stays the source of truth on
    # the way back.
    op.alter_column("refreshtoken", "is_revoked", server_default=None)
