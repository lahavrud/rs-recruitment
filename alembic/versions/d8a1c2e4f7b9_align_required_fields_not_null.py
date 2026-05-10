"""align required fields with API schemas (NOT NULL on phone, company core, salary)

Revision ID: d8a1c2e4f7b9
Revises: c964474a7969
Create Date: 2026-05-11 00:16:18.080665

Resolves the schema/DB mismatch where the API requires fields that the database
allowed to be NULL. Specifically:

- ``candidateprofile.phone``
- ``companyprofile.company_id``, ``address``, ``contact_first_name``,
  ``contact_last_name``, ``contact_mobile_phone``
- ``job.salary_min``, ``job.salary_max``

These were always written non-null by every API code path, but the DB allowed
partial NULL state — so admin tools, seed scripts, or future endpoints could
leak NULLs into the table. The migration locks the contract down at the
database level.

Pre-existing stub rows (created by the old seed script or abandoned admin
flows) that contain NULLs in any of the required CompanyProfile columns are
deleted along with their dependent Users, RefreshTokens, ActivationTokens,
Jobs, and Applications. This matches the policy "delete the bad data, then
NOT NULL"; production is empty at the time of writing, so this is safe.
"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

revision: str = "d8a1c2e4f7b9"
down_revision: Union[str, Sequence[str], None] = "c964474a7969"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # ── 1. Purge company profiles that would block the NOT NULL constraints ──
    # Any row missing one of the five now-required fields is treated as broken
    # data. Cascade: applications → jobs → refresh/activation tokens → users →
    # company profile.

    bind = op.get_bind()

    bad_profile_ids = [
        row[0]
        for row in bind.execute(
            sa.text(
                "SELECT id FROM companyprofile "
                "WHERE company_id IS NULL "
                "   OR address IS NULL "
                "   OR contact_first_name IS NULL "
                "   OR contact_last_name IS NULL "
                "   OR contact_mobile_phone IS NULL"
            )
        ).fetchall()
    ]

    if bad_profile_ids:
        bad_user_ids = [
            row[0]
            for row in bind.execute(
                sa.text(
                    "SELECT user_id FROM companyprofile "
                    "WHERE id = ANY(:ids) AND user_id IS NOT NULL"
                ),
                {"ids": bad_profile_ids},
            ).fetchall()
        ]

        # applications → jobs of those companies
        bind.execute(
            sa.text(
                "DELETE FROM application "
                "WHERE job_id IN (SELECT id FROM job WHERE company_id = ANY(:ids))"
            ),
            {"ids": bad_profile_ids},
        )
        bind.execute(
            sa.text("DELETE FROM job WHERE company_id = ANY(:ids)"),
            {"ids": bad_profile_ids},
        )

        if bad_user_ids:
            # RefreshToken and ActivationToken don't have their own migrations
            # — they're created by metadata.create_all() in dev/tests but may
            # not exist on a prod DB applied purely through alembic. Skip when
            # the table is absent.
            if bind.execute(sa.text("SELECT to_regclass('refreshtoken')")).scalar():
                bind.execute(
                    sa.text("DELETE FROM refreshtoken WHERE user_id = ANY(:ids)"),
                    {"ids": bad_user_ids},
                )
            if bind.execute(sa.text("SELECT to_regclass('activationtoken')")).scalar():
                bind.execute(
                    sa.text(
                        "DELETE FROM activationtoken WHERE company_user_id = ANY(:ids)"
                    ),
                    {"ids": bad_user_ids},
                )

        bind.execute(
            sa.text("DELETE FROM companyprofile WHERE id = ANY(:ids)"),
            {"ids": bad_profile_ids},
        )

        if bad_user_ids:
            bind.execute(
                sa.text('DELETE FROM "user" WHERE id = ANY(:ids)'),
                {"ids": bad_user_ids},
            )

    # ── 2. Apply NOT NULL constraints ──
    op.alter_column(
        "candidateprofile", "phone", existing_type=sa.String(), nullable=False
    )

    op.alter_column(
        "companyprofile", "company_id", existing_type=sa.String(), nullable=False
    )
    op.alter_column(
        "companyprofile", "address", existing_type=sa.Text(), nullable=False
    )
    op.alter_column(
        "companyprofile",
        "contact_first_name",
        existing_type=sa.String(),
        nullable=False,
    )
    op.alter_column(
        "companyprofile", "contact_last_name", existing_type=sa.String(), nullable=False
    )
    op.alter_column(
        "companyprofile",
        "contact_mobile_phone",
        existing_type=sa.String(),
        nullable=False,
    )

    op.alter_column("job", "salary_min", existing_type=sa.Integer(), nullable=False)
    op.alter_column("job", "salary_max", existing_type=sa.Integer(), nullable=False)

    # ── 3. Replace the Job salary CHECK constraint with the simpler form. ──
    # Both columns are now NOT NULL, so the IS NULL branches are dead.
    op.drop_constraint("ck_job_salary_range", "job", type_="check")
    op.create_check_constraint(
        "ck_job_salary_range",
        "job",
        "salary_min <= salary_max",
    )


def downgrade() -> None:
    """Downgrade schema (does NOT restore deleted stub rows)."""
    op.drop_constraint("ck_job_salary_range", "job", type_="check")
    op.create_check_constraint(
        "ck_job_salary_range",
        "job",
        "salary_min IS NULL OR salary_max IS NULL OR salary_min <= salary_max",
    )

    op.alter_column("job", "salary_max", existing_type=sa.Integer(), nullable=True)
    op.alter_column("job", "salary_min", existing_type=sa.Integer(), nullable=True)

    op.alter_column(
        "companyprofile",
        "contact_mobile_phone",
        existing_type=sa.String(),
        nullable=True,
    )
    op.alter_column(
        "companyprofile", "contact_last_name", existing_type=sa.String(), nullable=True
    )
    op.alter_column(
        "companyprofile", "contact_first_name", existing_type=sa.String(), nullable=True
    )
    op.alter_column("companyprofile", "address", existing_type=sa.Text(), nullable=True)
    op.alter_column(
        "companyprofile", "company_id", existing_type=sa.String(), nullable=True
    )

    op.alter_column(
        "candidateprofile", "phone", existing_type=sa.String(), nullable=True
    )
