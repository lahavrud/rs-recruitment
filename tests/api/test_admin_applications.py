"""Integration tests for admin application management endpoints."""

import pytest
from httpx import AsyncClient

from src.enums import ApplicationStatus
from src.models import Application, CandidateProfile, Job
from tests.conftest import TestSessionLocal

# ==================== GET /api/admin/applications ====================


@pytest.mark.asyncio
async def test_list_applications_requires_admin(public_client: AsyncClient):
    """Unauthenticated clients cannot access admin application endpoints."""
    response = await public_client.get("/api/admin/applications")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_list_applications_empty(admin_client: AsyncClient):
    """Returns empty list when no applications exist."""
    response = await admin_client.get("/api/admin/applications")
    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.asyncio
async def test_list_applications_success(
    admin_client: AsyncClient,
    application: Application,
):
    """Returns applications with nested job and candidate details."""
    response = await admin_client.get("/api/admin/applications")
    assert response.status_code == 200

    data = response.json()
    assert len(data) == 1
    assert data[0]["id"] == application.id
    assert data[0]["status"] == ApplicationStatus.NEW
    assert "job" in data[0]
    assert "candidate" in data[0]
    assert data[0]["job"] is not None
    assert data[0]["candidate"] is not None


@pytest.mark.asyncio
async def test_list_applications_filter_by_status(
    admin_client: AsyncClient,
    application: Application,
    published_job: Job,
):
    """Filter by status returns only matching applications."""
    # Create a second application with a different status
    async with TestSessionLocal() as session:
        candidate2 = CandidateProfile(
            full_name="Second Candidate", email="second@test.com"
        )
        session.add(candidate2)
        await session.flush()
        app2 = Application(
            job_id=published_job.id,
            candidate_id=candidate2.id,
            status=ApplicationStatus.APPROVED_BY_ADMIN,
        )
        session.add(app2)
        await session.commit()

    new_resp = await admin_client.get("/api/admin/applications?status=NEW")
    approved_resp = await admin_client.get(
        "/api/admin/applications?status=APPROVED_BY_ADMIN"
    )

    assert new_resp.status_code == 200
    assert all(a["status"] == "NEW" for a in new_resp.json())

    assert approved_resp.status_code == 200
    assert all(a["status"] == "APPROVED_BY_ADMIN" for a in approved_resp.json())


@pytest.mark.asyncio
async def test_list_applications_filter_by_job_id(
    admin_client: AsyncClient,
    application: Application,
):
    """Filter by job_id returns only applications for that job."""
    response = await admin_client.get(
        f"/api/admin/applications?job_id={application.job_id}"
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["job_id"] == application.job_id


# ==================== GET /api/admin/applications/{id} ====================


@pytest.mark.asyncio
async def test_get_application_success(
    admin_client: AsyncClient,
    application: Application,
    candidate_profile: CandidateProfile,
):
    """Returns full application detail with nested job and candidate."""
    response = await admin_client.get(f"/api/admin/applications/{application.id}")
    assert response.status_code == 200

    data = response.json()
    assert data["id"] == application.id
    assert data["status"] == ApplicationStatus.NEW
    assert data["job"]["id"] == application.job_id
    assert data["candidate"]["email"] == candidate_profile.email


@pytest.mark.asyncio
async def test_get_application_not_found(admin_client: AsyncClient):
    """Returns 404 for a non-existent application."""
    response = await admin_client.get("/api/admin/applications/99999")
    assert response.status_code == 404
    assert "99999" in response.json()["detail"]


@pytest.mark.asyncio
async def test_get_application_requires_admin(
    public_client: AsyncClient,
    application: Application,
):
    """Unauthenticated clients cannot access application detail."""
    response = await public_client.get(f"/api/admin/applications/{application.id}")
    assert response.status_code == 401


# ==================== PUT /api/admin/applications/{id}/status ====================


@pytest.mark.asyncio
async def test_update_application_status_success(
    admin_client: AsyncClient,
    application: Application,
):
    """Admin can update application status from NEW to APPROVED_BY_ADMIN."""
    response = await admin_client.put(
        f"/api/admin/applications/{application.id}/status",
        json={"status": "APPROVED_BY_ADMIN"},
    )
    assert response.status_code == 200

    data = response.json()
    assert data["id"] == application.id
    assert data["status"] == "APPROVED_BY_ADMIN"


@pytest.mark.asyncio
async def test_update_application_status_with_notes(
    admin_client: AsyncClient,
    application: Application,
):
    """Admin notes are stored alongside the status update."""
    response = await admin_client.put(
        f"/api/admin/applications/{application.id}/status",
        json={"status": "REJECTED", "admin_notes": "Not a fit for this role"},
    )
    assert response.status_code == 200
    assert response.json()["admin_notes"] == "Not a fit for this role"
    assert response.json()["status"] == "REJECTED"


@pytest.mark.asyncio
async def test_update_application_status_invalid_transition(
    admin_client: AsyncClient,
    application: Application,
):
    """Returns 400 when the status transition is not allowed."""
    # NEW → HIRED is not a valid transition
    response = await admin_client.put(
        f"/api/admin/applications/{application.id}/status",
        json={"status": "HIRED"},
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_update_application_status_not_found(admin_client: AsyncClient):
    """Returns 404 when application does not exist."""
    response = await admin_client.put(
        "/api/admin/applications/99999/status",
        json={"status": "APPROVED_BY_ADMIN"},
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_update_application_status_requires_admin(
    public_client: AsyncClient,
    application: Application,
):
    """Unauthenticated clients cannot update application status."""
    response = await public_client.put(
        f"/api/admin/applications/{application.id}/status",
        json={"status": "APPROVED_BY_ADMIN"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_update_application_status_missing_status(
    admin_client: AsyncClient,
    application: Application,
):
    """Returns 422 when status field is missing from the request body."""
    response = await admin_client.put(
        f"/api/admin/applications/{application.id}/status",
        json={"admin_notes": "notes only, no status"},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_terminal_state_cannot_transition(
    admin_client: AsyncClient,
    application: Application,
):
    """Once REJECTED, the application cannot be transitioned further."""
    # First, reject it
    await admin_client.put(
        f"/api/admin/applications/{application.id}/status",
        json={"status": "REJECTED"},
    )

    # Then try to approve it — must fail
    response = await admin_client.put(
        f"/api/admin/applications/{application.id}/status",
        json={"status": "APPROVED_BY_ADMIN"},
    )
    assert response.status_code == 400
