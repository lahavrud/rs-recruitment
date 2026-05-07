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
