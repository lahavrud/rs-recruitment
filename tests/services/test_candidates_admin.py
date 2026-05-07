"""Unit tests for the admin candidates service layer."""

from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from src.models import CandidateProfile
from src.services.candidates_admin import list_candidates


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
