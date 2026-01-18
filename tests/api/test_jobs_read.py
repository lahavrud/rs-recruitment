"""Integration tests for job read API endpoints."""

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
async def test_job_read_endpoints_require_auth(test_db):
    """Test that job read endpoints require authentication."""
    from httpx import ASGITransport

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/jobs/")
        assert response.status_code == 401  # Unauthorized (no auth token)

        response = await client.get("/api/jobs/1")
        assert response.status_code == 401

    app.dependency_overrides.clear()
