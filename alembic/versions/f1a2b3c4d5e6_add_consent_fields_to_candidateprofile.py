"""add consent fields to candidateprofile

Revision ID: f1a2b3c4d5e6
Revises: e9a5c1d3f2b8
Create Date: 2026-05-15 00:00:00.000000

Adds four nullable columns to candidateprofile to record privacy consent
captured at application time. Existing rows stay NULL — they pre-date
the consent requirement and are treated as legacy in audits.
"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

revision: str = "f1a2b3c4d5e6"
down_revision: Union[str, Sequence[str], None] = "e9a5c1d3f2b8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "candidateprofile",
        sa.Column("consent_given_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "candidateprofile",
        sa.Column("consent_policy_version", sa.String(length=20), nullable=True),
    )
    op.add_column(
        "candidateprofile",
        sa.Column("consent_ip", sa.String(length=45), nullable=True),
    )
    op.add_column(
        "candidateprofile",
        sa.Column("consent_user_agent", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("candidateprofile", "consent_user_agent")
    op.drop_column("candidateprofile", "consent_ip")
    op.drop_column("candidateprofile", "consent_policy_version")
    op.drop_column("candidateprofile", "consent_given_at")
