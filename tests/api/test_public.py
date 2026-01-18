"""Integration tests for public API endpoints (no authentication required)."""

import pytest
from httpx import AsyncClient

from src.enums import JobStatus
from src.models import CompanyProfile, Job
from tests.conftest import TestSessionLocal


@pytest.mark.asyncio
async def test_get_public_jobs_empty(public_client: AsyncClient):
    """Test getting public jobs when none exist."""
    response = await public_client.get("/api/public/jobs")
    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.asyncio
async def test_get_public_jobs_only_published(
    public_client: AsyncClient,
    company_profile: CompanyProfile,
    published_job: Job,
    pending_job: Job,
    closed_job: Job,
):
    """Test that public endpoint only returns published jobs."""
    response = await public_client.get("/api/public/jobs")
    assert response.status_code == 200

    data = response.json()
    # Should only return published job, not pending or closed
    assert len(data) == 1
    assert data[0]["id"] == published_job.id
    assert data[0]["status"] == "PUBLISHED"
    assert data[0]["title"] == "Senior Python Developer"


@pytest.mark.asyncio
async def test_get_public_jobs_multiple_published(
    public_client: AsyncClient, company_profile: CompanyProfile, published_job: Job
):
    """Test getting multiple published jobs."""
    # Create another published job
    async with TestSessionLocal() as session:
        job2 = Job(
            company_id=company_profile.id,
            title="Frontend Developer",
            description="We are looking for a frontend developer...",
            requirements="3+ years experience with React",
            location="Tel Aviv, Israel",
            status=JobStatus.PUBLISHED,
        )
        session.add(job2)
        await session.commit()

    response = await public_client.get("/api/public/jobs")
    assert response.status_code == 200

    data = response.json()
    assert len(data) == 2
    # Should be ordered by creation date (newest first)
    assert all("id" in job for job in data)
    assert all("title" in job for job in data)
    assert all("status" in job for job in data)
    assert all(job["status"] == "PUBLISHED" for job in data)


@pytest.mark.asyncio
async def test_get_public_job_success(public_client: AsyncClient, published_job: Job):
    """Test getting a specific published job."""
    response = await public_client.get(f"/api/public/jobs/{published_job.id}")
    assert response.status_code == 200

    data = response.json()
    assert data["id"] == published_job.id
    assert data["title"] == published_job.title
    assert data["description"] == published_job.description
    assert data["requirements"] == published_job.requirements
    assert data["location"] == published_job.location
    assert data["status"] == "PUBLISHED"


@pytest.mark.asyncio
async def test_get_public_job_not_found(public_client: AsyncClient):
    """Test getting a non-existent job returns 404."""
    response = await public_client.get("/api/public/jobs/99999")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_get_public_job_pending_not_visible(
    public_client: AsyncClient, pending_job: Job
):
    """Test that pending jobs are not visible via public endpoint."""
    response = await public_client.get(f"/api/public/jobs/{pending_job.id}")
    assert response.status_code == 404
    detail = response.json()["detail"].lower()
    assert "not published" in detail or "not found" in detail


@pytest.mark.asyncio
async def test_get_public_job_closed_not_visible(
    public_client: AsyncClient, closed_job: Job
):
    """Test that closed jobs are not visible via public endpoint."""
    response = await public_client.get(f"/api/public/jobs/{closed_job.id}")
    assert response.status_code == 404
    detail = response.json()["detail"].lower()
    assert "not published" in detail or "not found" in detail


@pytest.mark.asyncio
async def test_public_endpoints_no_auth_required(
    public_client: AsyncClient, published_job: Job
):
    """Test that public endpoints work without authentication."""
    # These endpoints should work without any auth token
    response = await public_client.get("/api/public/jobs")
    assert response.status_code == 200

    response = await public_client.get(f"/api/public/jobs/{published_job.id}")
    assert response.status_code == 200
