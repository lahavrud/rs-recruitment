"""Tests for Job model."""

from collections.abc import AsyncGenerator

import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from src.enums import JobStatus, UserRole
from src.models import CompanyProfile, Job, User


@pytest.fixture
async def company_with_user(
    session: AsyncSession,
) -> AsyncGenerator[CompanyProfile, None]:
    """Create a company profile with user for testing."""
    user = User(
        email="company@test.com",
        hashed_password="hashed",
        role=UserRole.COMPANY,
        is_active=True,
    )
    session.add(user)
    await session.flush()

    company = CompanyProfile(
        user_id=user.id,  # type: ignore[arg-type]
        name="Test Company",
        logo_url="https://example.com/logo.png",
        contact_person="John Doe",
        contact_phone="+1234567890",
    )
    session.add(company)
    await session.commit()
    await session.refresh(company)
    yield company


@pytest.mark.asyncio
async def test_job_creation(session: AsyncSession, company_with_user: CompanyProfile):
    """Test creating a Job model."""
    assert company_with_user.id is not None
    job = Job(
        company_id=company_with_user.id,
        title="Senior Python Developer",
        description="We are looking for a senior Python developer...",
        requirements="5+ years experience with Python, FastAPI, PostgreSQL",
        location="Tel Aviv, Israel",
    )
    session.add(job)
    await session.commit()
    await session.refresh(job)

    # Verify job was created with correct defaults
    assert job.id is not None
    assert job.title == "Senior Python Developer"
    assert job.status == JobStatus.PENDING_APPROVAL
    assert job.created_at is not None
    assert job.updated_at is not None


@pytest.mark.asyncio
async def test_job_status_enum(
    session: AsyncSession, company_with_user: CompanyProfile
):
    """Test Job status enum values."""
    assert company_with_user.id is not None
    job = Job(
        company_id=company_with_user.id,
        title="Test Job",
        description="Description",
        requirements="Requirements",
        location="Location",
        status=JobStatus.PUBLISHED,
    )
    session.add(job)
    await session.commit()
    await session.refresh(job)

    assert job.status == JobStatus.PUBLISHED

    # Update status
    job.status = JobStatus.CLOSED
    await session.commit()
    await session.refresh(job)

    assert job.status == JobStatus.CLOSED


@pytest.mark.asyncio
async def test_job_company_relationship(
    session: AsyncSession, company_with_user: CompanyProfile
):
    """Test Job can access its CompanyProfile (one-way relationship)."""
    assert company_with_user.id is not None
    job = Job(
        company_id=company_with_user.id,
        title="Test Job",
        description="Description",
        requirements="Requirements",
        location="Location",
    )
    session.add(job)
    await session.commit()
    await session.refresh(job)

    # SQLModel 0.0.22: One-way relationship works
    assert job.company.id == company_with_user.id
    assert job.company.name == "Test Company"


@pytest.mark.asyncio
async def test_company_access_jobs_via_query(
    session: AsyncSession, company_with_user: CompanyProfile
):
    """Test accessing company's jobs via query (SQLModel 0.0.22 limitation)."""
    assert company_with_user.id is not None
    # Create multiple jobs for the company
    job1 = Job(
        company_id=company_with_user.id,
        title="Job 1",
        description="Description 1",
        requirements="Requirements 1",
        location="Location 1",
    )
    job2 = Job(
        company_id=company_with_user.id,
        title="Job 2",
        description="Description 2",
        requirements="Requirements 2",
        location="Location 2",
    )
    session.add(job1)
    session.add(job2)
    await session.commit()

    # Access jobs via query (not via relationship due to SQLModel 0.0.22)
    result = await session.execute(
        select(Job).where(Job.company_id == company_with_user.id)  # type: ignore[arg-type]
    )
    jobs = result.scalars().all()

    assert len(jobs) == 2
    assert jobs[0].title == "Job 1"
    assert jobs[1].title == "Job 2"


@pytest.mark.asyncio
async def test_job_foreign_key_constraint(session: AsyncSession):
    """Test foreign key constraint enforcement.

    With FK constraints enabled, attempting to create a job with a non-existent
    company_id should raise an IntegrityError.
    """
    # Attempting to create a job with non-existent company_id
    job = Job(
        company_id=9999,  # Non-existent company
        title="Test Job",
        description="Description",
        requirements="Requirements",
        location="Location",
    )
    session.add(job)

    # Should raise IntegrityError due to FK constraint violation
    with pytest.raises(IntegrityError):
        await session.commit()


@pytest.mark.asyncio
async def test_job_required_fields(
    session: AsyncSession, company_with_user: CompanyProfile
):
    """Test that all required fields must be provided."""
    assert company_with_user.id is not None
    # Missing title should fail at Pydantic validation
    with pytest.raises(Exception):  # ValidationError from Pydantic
        job = Job(  # type: ignore[call-arg]
            company_id=company_with_user.id,
            # title is missing - should fail
            description="Description",
            requirements="Requirements",
            location="Location",
        )
        session.add(job)
        await session.commit()
