"""Unit tests for the admin jobs CRUD service layer."""

from datetime import datetime, timedelta, timezone
from unittest.mock import patch

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.enums import ApplicationStatus, JobStatus
from src.models import Application, CandidateProfile, CompanyProfile, Job
from src.schemas import JobAdminCreate, JobAdminUpdate
from src.services.admin.jobs import (
    admin_create_job,
    delete_job,
    list_jobs,
    update_job,
)
from src.services.exceptions import CompanyNotFoundError, JobNotFoundError


def _payload(company_id: int, title: str = "Backend Engineer") -> JobAdminCreate:
    return JobAdminCreate(
        company_id=company_id,
        title=title,
        short_description="Short blurb for testing.",
        description="ניהול שרתים ופיתוח backend",
        requirements=[{"text": "3+ שנות ניסיון"}, {"text": "Req 2"}, {"text": "Req 3"}],
        location="תל אביב",
        salary_min=15000,
        salary_max=22000,
    )


# ── admin_create_job ──────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_admin_create_job_published_by_default(
    session: AsyncSession, company_with_user: CompanyProfile
):
    job = await admin_create_job(_payload(company_with_user.id), session)
    await session.commit()

    assert job.id is not None
    assert job.status == JobStatus.PUBLISHED
    assert job.company_id == company_with_user.id


@pytest.mark.asyncio
async def test_admin_create_job_unknown_company(session: AsyncSession):
    with pytest.raises(CompanyNotFoundError):
        await admin_create_job(_payload(company_id=99999), session)


# ── update_job ────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_update_job_partial_keeps_unset_fields(
    session: AsyncSession, company_with_user: CompanyProfile
):
    created = await admin_create_job(_payload(company_with_user.id), session)
    await session.commit()

    updated = await update_job(
        created.id,
        JobAdminUpdate(title="Senior Backend Engineer", status=JobStatus.CLOSED),
        session,
    )
    await session.commit()

    assert updated.title == "Senior Backend Engineer"
    assert updated.status == JobStatus.CLOSED
    assert updated.description == created.description  # untouched
    assert updated.location == created.location  # untouched


@pytest.mark.asyncio
async def test_update_job_not_found(session: AsyncSession):
    with pytest.raises(JobNotFoundError):
        await update_job(99999, JobAdminUpdate(title="anything"), session)


_PATCH_EMAIL = "src.services.admin.jobs.enqueue_email_task"
_PATCH_DEFER = "src.services.admin.jobs.defer_after_commit"


@pytest.mark.asyncio
async def test_update_job_enqueues_email_on_real_change(
    session: AsyncSession, company_with_user: CompanyProfile
):
    created = await admin_create_job(_payload(company_with_user.id), session)
    await session.commit()

    with patch(_PATCH_EMAIL) as mock_email:
        with patch(_PATCH_DEFER, side_effect=lambda fn: fn()):
            await update_job(
                created.id,
                JobAdminUpdate(title="Updated Title"),
                session,
            )
            await session.commit()

    mock_email.assert_called_once()
    call_kwargs = mock_email.call_args.kwargs
    assert call_kwargs["to"] == company_with_user.contact_email
    assert "עודכן" in call_kwargs["subject"]


@pytest.mark.asyncio
async def test_update_job_no_email_on_noop(
    session: AsyncSession, company_with_user: CompanyProfile
):
    created = await admin_create_job(_payload(company_with_user.id), session)
    await session.commit()

    with patch(_PATCH_EMAIL) as mock_email:
        with patch(_PATCH_DEFER, side_effect=lambda fn: fn()):
            await update_job(
                created.id,
                JobAdminUpdate(title="Backend Engineer"),  # same as original
                session,
            )
            await session.commit()

    mock_email.assert_not_called()


@pytest.mark.asyncio
async def test_update_job_no_email_when_company_has_no_user(
    session: AsyncSession,
):
    orphan_company = CompanyProfile(
        name="Orphan Co",
        company_id="999",
        address="כתובת",
        contact_email="orphan@test.com",
        contact_first_name="א",
        contact_last_name="ב",
        contact_mobile_phone="0501234567",
    )
    session.add(orphan_company)
    await session.flush()

    created = await admin_create_job(_payload(orphan_company.id), session)
    await session.commit()

    with patch(_PATCH_EMAIL) as mock_email:
        with patch(_PATCH_DEFER, side_effect=lambda fn: fn()):
            await update_job(
                created.id,
                JobAdminUpdate(title="New Title"),
                session,
            )
            await session.commit()

    mock_email.assert_not_called()


# ── delete_job ────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_delete_job_cascades_applications_keeps_candidate(
    session: AsyncSession, company_with_user: CompanyProfile
):
    job_id = (await admin_create_job(_payload(company_with_user.id), session)).id
    candidate = CandidateProfile(
        full_name="Tester", email="cand@test.com", phone="050-1111111"
    )
    session.add(candidate)
    await session.flush()
    session.add(
        Application(
            job_id=job_id,
            candidate_id=candidate.id,
            status=ApplicationStatus.NEW,
        )
    )
    await session.commit()

    await delete_job(job_id, session)
    await session.commit()

    job_row = await session.execute(
        select(Job).where(Job.id == job_id)  # pyright: ignore[reportArgumentType]
    )
    assert job_row.scalar_one_or_none() is None

    app_row = await session.execute(
        select(Application).where(Application.job_id == job_id)  # pyright: ignore[reportArgumentType]
    )
    assert app_row.scalar_one_or_none() is None

    candidate_row = await session.execute(
        select(CandidateProfile).where(CandidateProfile.id == candidate.id)  # pyright: ignore[reportArgumentType]
    )
    assert candidate_row.scalar_one() is not None  # candidate survives


@pytest.mark.asyncio
async def test_delete_job_not_found(session: AsyncSession):
    with pytest.raises(JobNotFoundError):
        await delete_job(99999, session)


# ── list_jobs ─────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_list_jobs_filters_by_status(
    session: AsyncSession, company_with_user: CompanyProfile
):
    base = datetime(2026, 1, 1, tzinfo=timezone.utc)
    for i, status in enumerate(
        [JobStatus.PUBLISHED, JobStatus.PUBLISHED, JobStatus.CLOSED]
    ):
        session.add(
            Job(
                company_id=company_with_user.id,
                title=f"Role {i}",
                short_description="Short blurb for testing.",
                description="x",
                requirements=[{"text": "x"}, {"text": "Req 2"}, {"text": "Req 3"}],
                location="x",
                status=status,
                created_at=base + timedelta(minutes=i),
                salary_min=15000,
                salary_max=25000,
            )
        )
    await session.commit()

    page = await list_jobs(session, status=JobStatus.PUBLISHED)
    assert {item.title for item in page.items} == {"Role 0", "Role 1"}
    assert page.next_cursor is None


@pytest.mark.asyncio
async def test_list_jobs_paginates_through_all(
    session: AsyncSession, company_with_user: CompanyProfile
):
    base = datetime(2026, 1, 1, tzinfo=timezone.utc)
    for i in range(15):
        session.add(
            Job(
                company_id=company_with_user.id,
                title=f"Role {i:02d}",
                short_description="Short blurb for testing.",
                description="x",
                requirements=[{"text": "x"}, {"text": "Req 2"}, {"text": "Req 3"}],
                location="x",
                status=JobStatus.PUBLISHED,
                created_at=base + timedelta(minutes=i),
                salary_min=15000,
                salary_max=25000,
            )
        )
    await session.commit()

    seen: list[str] = []
    cursor: str | None = None
    while True:
        page = await list_jobs(session, cursor=cursor, limit=5)
        seen.extend(item.title for item in page.items)
        if page.next_cursor is None:
            break
        cursor = page.next_cursor

    assert len(seen) == 15
    assert len(set(seen)) == 15
    # newest-first: last-created (Role 14) appears first
    assert seen[0] == "Role 14"
    assert seen[-1] == "Role 00"
