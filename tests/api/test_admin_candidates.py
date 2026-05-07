"""Integration tests for admin candidate management endpoints."""

from datetime import datetime, timedelta, timezone

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from src.models import CandidateProfile


@pytest.mark.asyncio
async def test_list_candidates_empty(admin_client: AsyncClient):
    """Returns an empty page when no candidates exist."""
    response = await admin_client.get("/api/admin/candidates")
    assert response.status_code == 200
    assert response.json() == {"items": [], "next_cursor": None}


@pytest.mark.asyncio
async def test_list_candidates_success(
    admin_client: AsyncClient,
    candidate_profile: CandidateProfile,
):
    """Returns the candidate inside a CursorPage envelope."""
    response = await admin_client.get("/api/admin/candidates")
    assert response.status_code == 200

    data = response.json()
    assert data["next_cursor"] is None
    assert len(data["items"]) == 1
    assert data["items"][0]["id"] == candidate_profile.id
    assert data["items"][0]["full_name"] == candidate_profile.full_name
    assert data["items"][0]["email"] == candidate_profile.email


@pytest.mark.asyncio
async def test_list_candidates_requires_admin(public_client: AsyncClient):
    """Unauthenticated clients cannot access the candidates list."""
    response = await public_client.get("/api/admin/candidates")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_list_candidates_invalid_cursor_returns_400(admin_client: AsyncClient):
    """Garbage cursors return 400 instead of leaking a stack trace."""
    response = await admin_client.get(
        "/api/admin/candidates", params={"cursor": "not-a-real-cursor"}
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_list_candidates_paginates_through_all(
    admin_client: AsyncClient, session: AsyncSession
):
    """Page-by-page traversal covers every candidate exactly once."""
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
    while True:
        params: dict[str, str | int] = {"limit": 10}
        if cursor is not None:
            params["cursor"] = cursor
        response = await admin_client.get("/api/admin/candidates", params=params)
        assert response.status_code == 200
        data = response.json()
        seen.extend(item["email"] for item in data["items"])
        if data["next_cursor"] is None:
            break
        cursor = data["next_cursor"]

    assert len(seen) == 25
    assert seen[0] == "user24@test.com"
    assert seen[-1] == "user00@test.com"
