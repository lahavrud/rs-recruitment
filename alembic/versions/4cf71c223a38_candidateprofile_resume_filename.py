"""candidateprofile.resume_filename

Display label for the candidate's profile-level resume — set on upload
from the user's original ``UploadFile.filename`` and editable later via
the candidate self-service profile (basename only; the extension is
locked to the stored file's). Nullable so legacy rows and PII-scrubbed
profiles keep working with the basename-of-storage-key UI fallback.

Per-Application snapshots of the filename are out of scope here; see
issue #666 for the matching ``application.resume_filename`` work.

Revision ID: 4cf71c223a38
Revises: 3796f955d5c0
Create Date: 2026-05-20 22:47:05.333994

"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "4cf71c223a38"
down_revision: Union[str, Sequence[str], None] = "3796f955d5c0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "candidateprofile",
        sa.Column("resume_filename", sa.String(length=255), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("candidateprofile", "resume_filename")
