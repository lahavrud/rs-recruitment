"""Tests for Application (Match) model."""

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from src.enums import ApplicationStatus, JobStatus, UserRole
from src.models import Application, CandidateProfile, CompanyProfile, Job, User


@pytest.fixture
async def job_and_candidate(session: AsyncSession) -> dict[str, Job | CandidateProfile]:
    """Create a job and candidate for testing applications."""
    # Create company with user
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
        company_id="123456789",
        address="רח׳ הדוגמה 1, תל אביב",
        contact_first_name="ישראל",
        contact_last_name="ישראלי",
        contact_mobile_phone="0501234567",
    )
    session.add(company)
    await session.flush()

    # Create job
    assert company.id is not None
    job = Job(
        company_id=company.id,
        title="Python Developer",
        description="Description",
        requirements="Requirements",
        location="Tel Aviv",
        status=JobStatus.PUBLISHED,
        salary_min=15000,
        salary_max=25000,
    )
    session.add(job)
    await session.flush()

    # Create candidate
    candidate = CandidateProfile(
        full_name="Jane Doe",
        email="jane@example.com",
        phone="050-1112233",
    )
    session.add(candidate)
    await session.commit()
    await session.refresh(job)
    await session.refresh(candidate)

    return {"job": job, "candidate": candidate}


@pytest.mark.asyncio
async def test_application_creation(session: AsyncSession, job_and_candidate):
    """Test creating an Application (Match) model."""
    job = job_and_candidate["job"]
    candidate = job_and_candidate["candidate"]
    assert isinstance(job, Job)
    assert isinstance(candidate, CandidateProfile)
    assert job.id is not None
    assert candidate.id is not None

    application = Application(
        job_id=job.id,  # type: ignore[arg-type]
        candidate_id=candidate.id,  # type: ignore[arg-type]
    )
    session.add(application)
    await session.commit()
    await session.refresh(application)

    # Verify application was created with correct defaults
    assert application.id is not None
    assert application.job_id == job.id
    assert application.candidate_id == candidate.id
    assert application.status == ApplicationStatus.NEW
    assert application.admin_notes is None
    assert application.created_at is not None
    assert application.updated_at is not None
