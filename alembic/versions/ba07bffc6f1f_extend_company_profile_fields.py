"""extend company profile fields

Revision ID: ba07bffc6f1f
Revises: 3f16caf9b5de
Create Date: 2026-05-02 00:44:19.833172

"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "ba07bffc6f1f"
down_revision: Union[str, Sequence[str], None] = "3f16caf9b5de"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "companyprofile", sa.Column("company_id", sa.String(9), nullable=True)
    )
    op.add_column(
        "companyprofile",
        sa.Column("contact_first_name", sa.String(100), nullable=True),
    )
    op.add_column(
        "companyprofile",
        sa.Column("contact_last_name", sa.String(100), nullable=True),
    )
    op.add_column(
        "companyprofile",
        sa.Column("contact_mobile_phone", sa.String(20), nullable=True),
    )
    op.add_column(
        "companyprofile",
        sa.Column("contact_landline_phone", sa.String(20), nullable=True),
    )
    op.drop_column("companyprofile", "contact_phone")
    op.drop_column("companyprofile", "contact_person")


def downgrade() -> None:
    """Downgrade schema."""
    op.add_column(
        "companyprofile",
        sa.Column("contact_person", sa.String(100), nullable=True),
    )
    op.add_column(
        "companyprofile", sa.Column("contact_phone", sa.String(30), nullable=True)
    )
    op.drop_column("companyprofile", "contact_landline_phone")
    op.drop_column("companyprofile", "contact_mobile_phone")
    op.drop_column("companyprofile", "contact_last_name")
    op.drop_column("companyprofile", "contact_first_name")
    op.drop_column("companyprofile", "company_id")
