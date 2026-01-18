"""Integration tests for job API endpoints."""

from unittest.mock import patch

import pytest
from httpx import AsyncClient
from sqlalchemy import select

from src.core.infrastructure.dependencies import get_current_company, get_session
from src.enums import JobStatus
from src.main import app
from src.models import CompanyProfile, Job, User
from src.schemas import CompanyProfileCreate, UserCreate
from src.services.auth import register_company_user
from tests.conftest import TestSessionLocal


@pytest.fixture
async def company_user(test_db):
    """Create a company user for testing."""
    async with TestSessionLocal() as session:
        user_data = UserCreate(
            email="company@test.com",
            password="password",
            company_profile=CompanyProfileCreate(name="Test Company"),
        )
        result = await register_company_user(user_data, session)
        await session.commit()
        # Activate the user
        user = result.user
        user.is_active = True
        await session.commit()
        return result.user


@pytest.fixture
async def company_profile(company_user: User):
    """Get company profile for testing."""
    async with TestSessionLocal() as session:
        result = await session.execute(
            select(CompanyProfile).where(  # pyright: ignore[reportArgumentType]
                CompanyProfile.user_id == company_user.id
            )
        )
        return result.scalar_one()


@pytest.fixture
async def job(company_profile: CompanyProfile):
    """Create a job for testing."""
    async with TestSessionLocal() as session:
        job = Job(
            company_id=company_profile.id,
            title="Senior Python Developer",
            description="We are looking for a senior Python developer...",
            requirements="5+ years experience with Python, FastAPI, PostgreSQL",
            location="Tel Aviv, Israel",
            status=JobStatus.PENDING_APPROVAL,
        )
        session.add(job)
        await session.commit()
        await session.refresh(job)
        return job


@pytest.fixture
async def client(company_user: User):
    """Create test client with authentication."""

    async def override_get_session():
        async with TestSessionLocal() as session:
            yield session

    async def override_get_current_company():
        async with TestSessionLocal() as session:
            result = await session.execute(
                select(User).where(User.id == company_user.id)  # pyright: ignore[reportArgumentType]
            )
            user = result.scalar_one()
            result = await session.execute(
                select(CompanyProfile).where(  # pyright: ignore[reportArgumentType]
                    CompanyProfile.user_id == user.id
                )
            )
            company_profile = result.scalar_one()
            return (user, company_profile)

    app.dependency_overrides[get_session] = override_get_session
    app.dependency_overrides[get_current_company] = override_get_current_company

    from httpx import ASGITransport

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client

    app.dependency_overrides.clear()


@pytest.mark.asyncio
@patch("src.services.jobs.enqueue_email_task")
@patch("src.services.jobs.get_all_admin_emails")
async def test_create_job_success(
    mock_get_admin_emails,
    mock_enqueue_email,
    client: AsyncClient,
    company_profile: CompanyProfile,
):
    """Test creating a job successfully."""
    mock_enqueue_email.return_value = "test-job-id"
    mock_get_admin_emails.return_value = ["admin@test.com"]

    job_data = {
        "title": "Senior Python Developer",
        "description": "We are looking for a senior Python developer...",
        "requirements": "5+ years experience with Python, FastAPI, PostgreSQL",
        "location": "Tel Aviv, Israel",
    }

    response = await client.post("/api/jobs/", json=job_data)
    assert response.status_code == 201

    data = response.json()
    assert data["title"] == "Senior Python Developer"
    assert data["status"] == "PENDING_APPROVAL"
    assert data["company_id"] == company_profile.id
    assert "id" in data
    assert "created_at" in data

    # Verify email was sent
    mock_enqueue_email.assert_called_once()


@pytest.mark.asyncio
async def test_get_company_jobs_empty(client: AsyncClient):
    """Test getting jobs when none exist."""
    response = await client.get("/api/jobs/")
    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.asyncio
async def test_get_company_jobs(client: AsyncClient, company_profile: CompanyProfile):
    """Test getting all jobs for a company."""
    # Create jobs
    async with TestSessionLocal() as session:
        job1 = Job(
            company_id=company_profile.id,
            title="Job 1",
            description="Description 1",
            requirements="Requirements 1",
            location="Location 1",
        )
        job2 = Job(
            company_id=company_profile.id,
            title="Job 2",
            description="Description 2",
            requirements="Requirements 2",
            location="Location 2",
        )
        session.add(job1)
        session.add(job2)
        await session.commit()

    response = await client.get("/api/jobs/")
    assert response.status_code == 200

    data = response.json()
    assert len(data) == 2
    assert all("id" in job for job in data)
    assert all("title" in job for job in data)


@pytest.mark.asyncio
async def test_get_job_success(client: AsyncClient, job: Job):
    """Test getting a specific job."""
    response = await client.get(f"/api/jobs/{job.id}")
    assert response.status_code == 200

    data = response.json()
    assert data["id"] == job.id
    assert data["title"] == job.title
    assert data["status"] == "PENDING_APPROVAL"


@pytest.mark.asyncio
async def test_get_job_not_found(client: AsyncClient):
    """Test getting a non-existent job."""
    response = await client.get("/api/jobs/999")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


@pytest.mark.asyncio
@patch("src.services.jobs.enqueue_email_task")
@patch("src.services.jobs.get_all_admin_emails")
async def test_update_job_success(
    mock_get_admin_emails,
    mock_enqueue_email,
    client: AsyncClient,
    job: Job,
):
    """Test updating a job successfully."""
    mock_enqueue_email.return_value = "test-job-id"
    mock_get_admin_emails.return_value = ["admin@test.com"]

    update_data = {
        "title": "Updated Title",
        "location": "Updated Location",
    }

    response = await client.put(f"/api/jobs/{job.id}", json=update_data)
    assert response.status_code == 200

    data = response.json()
    assert data["title"] == "Updated Title"
    assert data["location"] == "Updated Location"
    assert data["description"] == job.description  # Unchanged

    # Verify email was sent
    mock_enqueue_email.assert_called_once()


@pytest.mark.asyncio
async def test_update_job_not_found(client: AsyncClient):
    """Test updating a non-existent job."""
    update_data = {"title": "Updated Title"}

    response = await client.put("/api/jobs/999", json=update_data)
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_update_job_cannot_change_status(client: AsyncClient, job: Job):
    """Test that companies cannot change job status."""
    update_data = {"status": "PUBLISHED"}

    response = await client.put(f"/api/jobs/{job.id}", json=update_data)
    assert response.status_code == 400
    assert "cannot change job status" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_update_job_closed_status(client: AsyncClient, job: Job):
    """Test updating a job with CLOSED status."""
    # Set job status to CLOSED
    async with TestSessionLocal() as session:
        db_job = await session.get(Job, job.id)
        db_job.status = JobStatus.CLOSED
        await session.commit()

    update_data = {"title": "Updated Title"}

    response = await client.put(f"/api/jobs/{job.id}", json=update_data)
    assert response.status_code == 400
    assert "cannot be updated" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_delete_job_success(client: AsyncClient, job: Job):
    """Test deleting a job successfully."""
    job_id = job.id
    response = await client.delete(f"/api/jobs/{job_id}")
    assert response.status_code == 204

    # Verify job was deleted
    async with TestSessionLocal() as session:
        db_job = await session.get(Job, job_id)
        assert db_job is None


@pytest.mark.asyncio
async def test_delete_job_not_found(client: AsyncClient):
    """Test deleting a non-existent job."""
    response = await client.delete("/api/jobs/999")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_delete_job_published_status(client: AsyncClient, job: Job):
    """Test deleting a job with PUBLISHED status."""
    # Set job status to PUBLISHED
    async with TestSessionLocal() as session:
        db_job = await session.get(Job, job.id)
        db_job.status = JobStatus.PUBLISHED
        await session.commit()

    response = await client.delete(f"/api/jobs/{job.id}")
    assert response.status_code == 400
    assert "cannot be deleted" in response.json()["detail"].lower()
    assert "PENDING_APPROVAL" in response.json()["detail"]


@pytest.mark.asyncio
async def test_job_endpoints_require_auth(test_db):
    """Test that job endpoints require authentication."""
    from httpx import ASGITransport

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post("/api/jobs/", json={})
        assert response.status_code == 401  # Unauthorized (no auth token)

        response = await client.get("/api/jobs/")
        assert response.status_code == 401

        response = await client.get("/api/jobs/1")
        assert response.status_code == 401

        response = await client.put("/api/jobs/1", json={})
        assert response.status_code == 401

        response = await client.delete("/api/jobs/1")
        assert response.status_code == 401

    app.dependency_overrides.clear()
