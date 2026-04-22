"""Unit tests for public job board service functions."""

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from src.enums import JobStatus
from src.models import CompanyProfile, Job
from src.schemas import JobPublicRead  # Use the new restricted schema
from src.services.exceptions import JobNotFoundError
from src.services.jobs_public import get_published_job, list_published_jobs


@pytest.mark.asyncio
async def test_list_published_jobs_empty(session: AsyncSession):
    """Test listing published jobs when none exist."""
    jobs = await list_published_jobs(session)
    assert jobs == []


@pytest.mark.asyncio
async def test_list_published_jobs(
    session: AsyncSession, company_with_user: CompanyProfile
):
    """Test listing published jobs returns JobPublicRead and filters fields."""
    # Create multiple published jobs
    job1 = Job(
        company_id=company_with_user.id,
        title="Job 1",
        description="Description 1",
        requirements="Requirements 1",
        location="Location 1",
        status=JobStatus.PUBLISHED,
    )
    job2 = Job(
        company_id=company_with_user.id,
        title="Job 2",
        description="Description 2",
        requirements="Requirements 2",
        location="Location 2",
        status=JobStatus.PUBLISHED,
    )
    session.add_all([job1, job2])
    await session.commit()

    jobs = await list_published_jobs(session)

    assert len(jobs) == 2
    # Verify the service uses the correct schema
    assert isinstance(jobs[0], JobPublicRead)

    # Verify internal fields are not present in the model's exported data
    job_dict = jobs[0].model_dump()
    assert "company_id" not in job_dict
    assert "updated_at" not in job_dict
    assert "status" in job_dict


@pytest.mark.asyncio
async def test_get_published_job_success(
    session: AsyncSession, company_with_user: CompanyProfile
):
    """Test getting a published job returns restricted fields."""
    job = Job(
        company_id=company_with_user.id,
        title="Senior Python Developer",
        description="We are looking for a developer...",
        requirements="Python experience",
        location="Tel Aviv",
        status=JobStatus.PUBLISHED,
    )
    session.add(job)
    await session.commit()
    await session.refresh(job)

    result = await get_published_job(job.id, session)

    # Verify return type and field exclusion
    assert isinstance(result, JobPublicRead)

    result_data = result.model_dump()
    assert "company_id" not in result_data
    assert "updated_at" not in result_data
    assert result.id == job.id
    assert result.title == "Senior Python Developer"


@pytest.mark.asyncio
async def test_get_published_job_not_found(session: AsyncSession):
    """Test getting a non-existent job."""
    with pytest.raises(JobNotFoundError, match="not found"):
        await get_published_job(99999, session)


@pytest.mark.asyncio
async def test_get_published_job_not_published(
    session: AsyncSession, company_with_user: CompanyProfile
):
    """Test getting a job that is not published."""
    job = Job(
        company_id=company_with_user.id,
        title="Pending Job",
        description="Description",
        requirements="Requirements",
        location="Location",
        status=JobStatus.PENDING_APPROVAL,
    )
    session.add(job)
    await session.commit()
    await session.refresh(job)

    with pytest.raises(JobNotFoundError, match="not published"):
        await get_published_job(job.id, session)
