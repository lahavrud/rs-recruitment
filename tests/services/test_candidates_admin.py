"""Unit tests for the admin candidates service layer."""

from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, patch

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.enums import ApplicationStatus, JobStatus
from src.models import Application, CandidateProfile, CompanyProfile, Job, User
from src.schemas import CandidateProfileUpdate
from src.services.candidates_admin import (
    delete_candidate,
    get_candidate,
    list_candidates,
    update_candidate,
)
from src.services.exceptions import CandidateNotFoundError


@pytest.mark.asyncio
async def test_list_candidates_empty(session: AsyncSession):
    """Returns an empty page when no candidates exist."""
    page = await list_candidates(session)
    assert page.items == []
    assert page.next_cursor is None


@pytest.mark.asyncio
async def test_list_candidates_returns_all(
    session: AsyncSession,
    candidate_profile: CandidateProfile,
):
    """Returns all candidates with correct fields when below the page size."""
    page = await list_candidates(session)
    assert len(page.items) == 1
    assert page.items[0].id == candidate_profile.id
    assert page.items[0].email == candidate_profile.email
    assert page.next_cursor is None


@pytest.mark.asyncio
async def test_list_candidates_ordered_newest_first(session: AsyncSession):
    """Candidates are returned newest-first within a page."""
    first = CandidateProfile(
        full_name="First", email="first@test.com", phone="050-1111111"
    )
    second = CandidateProfile(
        full_name="Second", email="second@test.com", phone="050-2222222"
    )
    session.add(first)
    session.add(second)
    await session.commit()

    page = await list_candidates(session)
    assert [item.email for item in page.items] == [
        "second@test.com",
        "first@test.com",
    ]


@pytest.mark.asyncio
async def test_list_candidates_paginates_with_cursor(session: AsyncSession):
    """A multi-page traversal returns each candidate exactly once."""
    base = datetime(2026, 1, 1, tzinfo=timezone.utc)
    for i in range(25):
        session.add(
            CandidateProfile(
                full_name=f"User {i:02d}",
                email=f"user{i:02d}@test.com",
                phone="050-0000000",
                created_at=base + timedelta(minutes=i),
            )
        )
    await session.commit()

    seen: list[str] = []
    cursor: str | None = None
    pages = 0
    while True:
        pages += 1
        assert pages <= 5  # safety cap (25 / 10 → 3 pages, generous bound)
        page = await list_candidates(session, cursor=cursor, limit=10)
        seen.extend(item.email for item in page.items)
        if page.next_cursor is None:
            break
        cursor = page.next_cursor

    assert len(seen) == 25
    assert len(set(seen)) == 25  # no duplicates across pages
    # Newest first across the entire traversal
    assert seen[0] == "user24@test.com"
    assert seen[-1] == "user00@test.com"


# ── get_candidate ─────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_get_candidate_returns_profile(
    session: AsyncSession, candidate_profile: CandidateProfile
):
    fetched = await get_candidate(candidate_profile.id, session)
    assert fetched.id == candidate_profile.id
    assert fetched.email == candidate_profile.email


@pytest.mark.asyncio
async def test_get_candidate_not_found(session: AsyncSession):
    with pytest.raises(CandidateNotFoundError):
        await get_candidate(99999, session)


# ── update_candidate ──────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_update_candidate_partial_keeps_unset_fields(
    session: AsyncSession, candidate_profile: CandidateProfile
):
    updated = await update_candidate(
        candidate_profile.id,
        CandidateProfileUpdate(full_name="New Name"),
        session,
    )
    await session.commit()
    assert updated.full_name == "New Name"
    assert updated.email == candidate_profile.email  # untouched
    assert updated.phone == candidate_profile.phone  # untouched


@pytest.mark.asyncio
async def test_update_candidate_not_found(session: AsyncSession):
    with pytest.raises(CandidateNotFoundError):
        await update_candidate(99999, CandidateProfileUpdate(full_name="x"), session)


# ── delete_candidate ──────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_delete_candidate_cascades_applications(
    session: AsyncSession, candidate_profile: CandidateProfile
):
    # Build a published job so we can attach an application
    user = User(
        email="c-deltest@test.com",
        hashed_password="hashed",
        is_active=True,
    )
    session.add(user)
    await session.flush()
    company = CompanyProfile(
        user_id=user.id,
        name="DelTest Co",
        company_id="123456789",
        contact_first_name="א",
        contact_last_name="ב",
        contact_mobile_phone="0501234567",
    )
    session.add(company)
    await session.flush()
    job = Job(
        company_id=company.id,
        title="Role",
        description="x",
        requirements="x",
        location="x",
        status=JobStatus.PUBLISHED,
    )
    session.add(job)
    await session.flush()
    session.add(
        Application(
            job_id=job.id,
            candidate_id=candidate_profile.id,
            status=ApplicationStatus.NEW,
        )
    )
    await session.commit()

    with patch("src.services.candidates_admin.get_storage_provider") as storage_factory:
        # delete_candidate calls get_storage_provider(); make it return a noop.
        storage_factory.return_value.delete_file = AsyncMock()
        await delete_candidate(candidate_profile.id, session)
        await session.commit()

    candidate_row = await session.execute(
        select(CandidateProfile).where(  # pyright: ignore[reportArgumentType]
            CandidateProfile.id == candidate_profile.id
        )
    )
    assert candidate_row.scalar_one_or_none() is None
    app_row = await session.execute(
        select(Application).where(  # pyright: ignore[reportArgumentType]
            Application.candidate_id == candidate_profile.id
        )
    )
    assert app_row.scalar_one_or_none() is None


@pytest.mark.asyncio
async def test_delete_candidate_with_resume_calls_storage(session: AsyncSession):
    candidate = CandidateProfile(
        full_name="Resume Holder",
        email="resume@test.com",
        phone="050-9999999",
        resume_path="resumes/2026/05/abc.pdf",
    )
    session.add(candidate)
    await session.commit()
    await session.refresh(candidate)

    with patch("src.services.candidates_admin.get_storage_provider") as storage_factory:
        delete_mock = AsyncMock()
        storage_factory.return_value.delete_file = delete_mock
        await delete_candidate(candidate.id, session)
        await session.commit()
        delete_mock.assert_awaited_once_with("resumes/2026/05/abc.pdf")


@pytest.mark.asyncio
async def test_delete_candidate_not_found(session: AsyncSession):
    with pytest.raises(CandidateNotFoundError):
        await delete_candidate(99999, session)
