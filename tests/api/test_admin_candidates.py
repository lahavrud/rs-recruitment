"""Integration tests for admin candidate management endpoints."""

import pytest
from httpx import AsyncClient

from src.models import CandidateProfile


@pytest.mark.asyncio
async def test_list_candidates_empty(admin_client: AsyncClient):
    """Returns empty list when no candidates exist."""
    response = await admin_client.get("/api/admin/candidates")
    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.asyncio
async def test_list_candidates_success(
    admin_client: AsyncClient,
    candidate_profile: CandidateProfile,
):
    """Returns all candidates with correct fields."""
    response = await admin_client.get("/api/admin/candidates")
    assert response.status_code == 200

    data = response.json()
    assert len(data) == 1
    assert data[0]["id"] == candidate_profile.id
    assert data[0]["full_name"] == candidate_profile.full_name
    assert data[0]["email"] == candidate_profile.email


@pytest.mark.asyncio
async def test_list_candidates_requires_admin(public_client: AsyncClient):
    """Unauthenticated clients cannot access the candidates list."""
    response = await public_client.get("/api/admin/candidates")
    assert response.status_code == 401
