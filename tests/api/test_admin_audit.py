"""Integration tests for the admin audit-log endpoint."""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from src.models import AuditLog


@pytest.mark.asyncio
async def test_admin_can_list_empty(admin_client: AsyncClient):
    response = await admin_client.get("/api/admin/audit-log")
    assert response.status_code == 200
    assert response.json() == {"items": [], "next_cursor": None}


@pytest.mark.asyncio
async def test_admin_can_filter(admin_client: AsyncClient, session: AsyncSession):
    session.add(
        AuditLog(
            actor_user_id=1,
            action="company.approve",
            target_type="CompanyProfile",
            target_id=10,
            ip_address="203.0.113.1",
        )
    )
    session.add(
        AuditLog(
            actor_user_id=2,
            action="candidate.delete",
            target_type="CandidateProfile",
            target_id=20,
        )
    )
    await session.commit()

    response = await admin_client.get(
        "/api/admin/audit-log", params={"target_type": "CandidateProfile"}
    )
    assert response.status_code == 200
    items = response.json()["items"]
    assert len(items) == 1
    assert items[0]["action"] == "candidate.delete"
    assert items[0]["target_id"] == 20


@pytest.mark.asyncio
async def test_audit_log_requires_admin(public_client: AsyncClient):
    response = await public_client.get("/api/admin/audit-log")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_audit_log_invalid_cursor_returns_400(admin_client: AsyncClient):
    response = await admin_client.get(
        "/api/admin/audit-log", params={"cursor": "not-real"}
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_candidate_delete_writes_audit_row(
    admin_client: AsyncClient, candidate_profile, session: AsyncSession
):
    """End-to-end: deleting a candidate produces a candidate.delete audit row."""
    candidate_id = candidate_profile.id
    response = await admin_client.delete(f"/api/admin/candidates/{candidate_id}")
    assert response.status_code == 204

    audit_response = await admin_client.get(
        "/api/admin/audit-log",
        params={"target_type": "CandidateProfile"},
    )
    items = audit_response.json()["items"]
    assert len(items) == 1
    assert items[0]["action"] == "candidate.delete"
    assert items[0]["target_id"] == candidate_id
    assert items[0]["actor_user_id"] is not None
