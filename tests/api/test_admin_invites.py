"""Tests for admin company invite-token endpoints."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_generate_invite_token_returns_token(admin_client: AsyncClient):
    """Admin can generate an invite token."""
    response = await admin_client.post(
        "/api/admin/companies/invite",
        json={"email": "invite@example.com"},
    )
    assert response.status_code == 201
    data = response.json()
    assert "token" in data
    # Value is set by the global mock_invite_tokens fixture in conftest.py.
    assert data["token"] == "test-invite-token-abc123"


@pytest.mark.asyncio
async def test_generate_invite_token_requires_admin(public_client: AsyncClient):
    """Unauthenticated clients cannot generate invites."""
    response = await public_client.post("/api/admin/companies/invite")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_list_invites_returns_cursor_page_envelope(admin_client: AsyncClient):
    """The invites list returns a CursorPage envelope, not a bare array."""
    response = await admin_client.get("/api/admin/companies/invites")
    assert response.status_code == 200
    body = response.json()
    assert set(body.keys()) == {"items", "next_cursor"}
    assert body["next_cursor"] is None
    assert isinstance(body["items"], list)


@pytest.mark.asyncio
async def test_list_invites_invalid_cursor_returns_400(admin_client: AsyncClient):
    response = await admin_client.get(
        "/api/admin/companies/invites", params={"cursor": "not-a-cursor"}
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_create_invite_persists_new_company_details(admin_client: AsyncClient):
    """Admin can pre-fill new-company details on the invite, and they round-trip.

    Regression test for #345: the InviteToken model has columns for
    company_name / contact_first_name / contact_last_name / note (intended
    to capture details for a brand-new company at invite-issuance time),
    but InviteTokenCreate only accepted `email`, so the fields were silently
    dropped — the company info supplied in the admin UI was never saved.
    """
    response = await admin_client.post(
        "/api/admin/companies/invite",
        json={
            "email": "new-co@example.com",
            "company_name": "Acme Robotics",
            "contact_first_name": "Ada",
            "contact_last_name": "Lovelace",
            "note": "introduced via partner program",
        },
    )
    assert response.status_code == 201
    body = response.json()
    assert body["email"] == "new-co@example.com"
    assert body["company_name"] == "Acme Robotics"
    assert body["contact_first_name"] == "Ada"
    assert body["contact_last_name"] == "Lovelace"
    assert body["note"] == "introduced via partner program"

    # Round-trip via list endpoint to confirm the row was persisted.
    listing = await admin_client.get("/api/admin/companies/invites")
    assert listing.status_code == 200
    items = listing.json()["items"]
    assert len(items) == 1
    assert items[0]["company_name"] == "Acme Robotics"
    assert items[0]["contact_first_name"] == "Ada"
    assert items[0]["contact_last_name"] == "Lovelace"
    assert items[0]["note"] == "introduced via partner program"
