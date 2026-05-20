"""candidateprofile.phone nullable

Relaxes the NOT NULL constraint on ``CandidateProfile.phone`` so:

* the activation-time profile creation (Sprint 11 / #605) doesn't have to
  write the empty-string placeholder it currently uses;
* the candidate self-service profile page can let the user clear phone
  (only full_name + email are mandatory identity, per the product brief);
* a PII-scrubbed (deleted) candidate profile can have phone blanked while
  the row sticks around for ``Application.candidate_id`` FK history.

The "phone is required to apply to a job" invariant is enforced at the
``Application`` insert point (public apply form + server schema), not by
this column.

Revision ID: 3796f955d5c0
Revises: 6c424e44ec00
Create Date: 2026-05-20 21:25:27.747095

"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "3796f955d5c0"
down_revision: Union[str, Sequence[str], None] = "6c424e44ec00"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        "candidateprofile",
        "phone",
        existing_type=sa.VARCHAR(),
        nullable=True,
    )


def downgrade() -> None:
    # Backfill any NULLs introduced under nullable=True before re-imposing
    # the constraint so the alter_column doesn't fail on existing rows.
    op.execute("UPDATE candidateprofile SET phone = '' WHERE phone IS NULL")
    op.alter_column(
        "candidateprofile",
        "phone",
        existing_type=sa.VARCHAR(),
        nullable=False,
    )
