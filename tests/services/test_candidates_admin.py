"""Unit tests for the admin candidates service layer."""

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from src.models import CandidateProfile
from src.services.candidates_admin import list_candidates


@pytest.mark.asyncio
async def test_list_candidates_empty(session: AsyncSession):
    """Returns empty list when no candidates exist."""
    result = await list_candidates(session)
    assert result == []


@pytest.mark.asyncio
async def test_list_candidates_returns_all(
    session: AsyncSession,
    candidate_profile: CandidateProfile,
):
    """Returns all candidates with correct fields."""
    result = await list_candidates(session)
    assert len(result) == 1
    assert result[0].id == candidate_profile.id
    assert result[0].email == candidate_profile.email


@pytest.mark.asyncio
async def test_list_candidates_ordered_newest_first(session: AsyncSession):
    """Candidates are returned newest-first."""
    first = CandidateProfile(
        full_name="First", email="first@test.com", phone="050-1111111"
    )
    second = CandidateProfile(
        full_name="Second", email="second@test.com", phone="050-2222222"
    )
    session.add(first)
    session.add(second)
    await session.commit()

    result = await list_candidates(session)
    assert len(result) == 2
    assert result[0].email == "second@test.com"
    assert result[1].email == "first@test.com"
