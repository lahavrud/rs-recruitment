"""Unit tests for candidate service layer."""

from unittest.mock import AsyncMock, patch

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.enums import ApplicationStatus
from src.models import Application, Job
from src.schemas import CandidateProfileCreate
from src.services.candidates import create_candidate_profile
from src.services.exceptions import JobNotFoundError


@pytest.mark.asyncio
@patch("src.services.candidates.enqueue_email_task")
@patch("src.services.candidates.get_storage_provider")
async def test_create_candidate_profile_success(
    mock_storage_provider,
    mock_enqueue_email,
    session: AsyncSession,
    company_with_user,
):
    """Test successfully creating a candidate profile without resume."""
    mock_enqueue_email.return_value = "test-job-id"

    # Create a published job
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
    assert job.id is not None

    # Create candidate data
    candidate_data = CandidateProfileCreate(
        full_name="John Doe",
        email="john@example.com",
        phone="123-456-7890",
        linkedin_url="https://linkedin.com/in/johndoe",
        service_concept="I want to work on exciting projects",
        salary_expectations="100k-120k",
    )

    candidate = await create_candidate_profile(
        candidate_data=candidate_data,
        job_id=job.id,
        session=session,
    )

    assert candidate.id is not None
    assert candidate.full_name == "John Doe"
    assert candidate.email == "john@example.com"
    assert candidate.phone == "123-456-7890"
    assert candidate.linkedin_url == "https://linkedin.com/in/johndoe"
    assert candidate.resume_path is None

    # Verify Application was created
    result = await session.execute(
        select(Application).where(  # pyright: ignore[reportArgumentType]
            Application.candidate_id == candidate.id,  # pyright: ignore[reportArgumentType]
            Application.job_id == job.id,  # pyright: ignore[reportArgumentType]
        )
    )
    application = result.scalar_one_or_none()
    assert application is not None
    assert application.status == ApplicationStatus.NEW

    # Note: Email is only sent if admin users exist
    # This test doesn't create an admin, so email won't be sent
    # For email testing, see test_create_candidate_profile_sends_admin_email


@pytest.mark.asyncio
@patch("src.services.candidates.enqueue_email_task")
@patch("src.services.candidates.get_storage_provider")
async def test_create_candidate_profile_with_resume(
    mock_storage_provider,
    mock_enqueue_email,
    session: AsyncSession,
    company_with_user,
):
    """Test creating a candidate profile with resume file upload."""
    mock_enqueue_email.return_value = "test-job-id"

    # Mock storage provider
    mock_storage = AsyncMock()
    mock_storage.upload_file = AsyncMock(return_value="resume-uuid-123.pdf")
    mock_storage_provider.return_value = mock_storage

    # Create a published job
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
    assert job.id is not None

    # Create candidate data with resume
    candidate_data = CandidateProfileCreate(
        full_name="Jane Doe",
        email="jane@example.com",
        phone="987-654-3210",
    )

    resume_file = b"fake pdf content"
    resume_filename = "resume.pdf"

    candidate = await create_candidate_profile(
        candidate_data=candidate_data,
        job_id=job.id,
        resume_file=resume_file,
        resume_filename=resume_filename,
        session=session,
    )

    assert candidate.id is not None
    assert candidate.full_name == "Jane Doe"
    assert candidate.email == "jane@example.com"
    assert candidate.resume_path == "resume-uuid-123.pdf"

    # Verify storage was called
    mock_storage.upload_file.assert_called_once()
    call_args = mock_storage.upload_file.call_args
    assert call_args[1]["file_content"] == resume_file
    assert call_args[1]["file_name"] == resume_filename

    # Verify Application was created
    result = await session.execute(
        select(Application).where(  # pyright: ignore[reportArgumentType]
            Application.candidate_id == candidate.id,  # pyright: ignore[reportArgumentType]
            Application.job_id == job.id,  # pyright: ignore[reportArgumentType]
        )
    )
    application = result.scalar_one_or_none()
    assert application is not None
    assert application.status == ApplicationStatus.NEW


@pytest.mark.asyncio
@patch("src.services.candidates.enqueue_email_task")
async def test_create_candidate_profile_duplicate_email(
    mock_enqueue_email,
    session: AsyncSession,
    company_with_user,
):
    """Test creating a candidate profile with duplicate email."""
    mock_enqueue_email.return_value = "test-job-id"

    # Create a published job
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
    assert job.id is not None

    # Create first candidate
    candidate_data1 = CandidateProfileCreate(
        full_name="John Doe",
        email="john@example.com",
    )
    candidate1 = await create_candidate_profile(
        candidate_data=candidate_data1,
        job_id=job.id,
        session=session,
    )
    assert candidate1.id is not None

    # Try to create second candidate with same email
    # Note: Email uniqueness is enforced at database level
    # SQLModel/SQLAlchemy will raise IntegrityError
    candidate_data2 = CandidateProfileCreate(
        full_name="Jane Doe",
        email="john@example.com",  # Duplicate email
    )

    from sqlalchemy.exc import IntegrityError

    with pytest.raises(IntegrityError):
        await create_candidate_profile(
            candidate_data=candidate_data2,
            job_id=job.id,
            session=session,
        )
        await session.commit()


@pytest.mark.asyncio
@patch("src.services.candidates.enqueue_email_task")
@patch("src.services.candidates.get_storage_provider")
async def test_create_candidate_profile_invalid_file(
    mock_storage_provider,
    mock_enqueue_email,
    session: AsyncSession,
    company_with_user,
):
    """Test creating a candidate profile with invalid file type."""
    mock_enqueue_email.return_value = "test-job-id"

    # Create a published job
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
    assert job.id is not None

    # Create candidate data with invalid file type
    candidate_data = CandidateProfileCreate(
        full_name="John Doe",
        email="john@example.com",
    )

    resume_file = b"fake content"
    resume_filename = "resume.txt"  # Invalid file type

    with pytest.raises(ValueError, match="Invalid file type"):
        await create_candidate_profile(
            candidate_data=candidate_data,
            job_id=job.id,
            resume_file=resume_file,
            resume_filename=resume_filename,
            session=session,
        )


@pytest.mark.asyncio
@patch("src.services.candidates.enqueue_email_task")
@patch("src.services.candidates.get_storage_provider")
async def test_create_candidate_profile_file_size_limit(
    mock_storage_provider,
    mock_enqueue_email,
    session: AsyncSession,
    company_with_user,
):
    """Test creating a candidate profile with file exceeding size limit."""
    mock_enqueue_email.return_value = "test-job-id"

    # Create a published job
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
    assert job.id is not None

    # Create candidate data with oversized file
    candidate_data = CandidateProfileCreate(
        full_name="John Doe",
        email="john@example.com",
    )

    # Create file larger than 10MB
    resume_file = b"x" * (11 * 1024 * 1024)  # 11MB
    resume_filename = "resume.pdf"

    with pytest.raises(ValueError, match="File size exceeds maximum"):
        await create_candidate_profile(
            candidate_data=candidate_data,
            job_id=job.id,
            resume_file=resume_file,
            resume_filename=resume_filename,
            session=session,
        )


@pytest.mark.asyncio
@patch("src.services.candidates.enqueue_email_task")
async def test_create_application_on_profile_creation(
    mock_enqueue_email,
    session: AsyncSession,
    company_with_user,
):
    """Test that Application record is created when candidate profile is created."""
    mock_enqueue_email.return_value = "test-job-id"

    # Create a published job
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
    assert job.id is not None

    # Create candidate
    candidate_data = CandidateProfileCreate(
        full_name="John Doe",
        email="john@example.com",
    )

    candidate = await create_candidate_profile(
        candidate_data=candidate_data,
        job_id=job.id,
        session=session,
    )

    # Verify Application was created with correct status
    result = await session.execute(
        select(Application).where(  # pyright: ignore[reportArgumentType]
            Application.candidate_id == candidate.id,  # pyright: ignore[reportArgumentType]
            Application.job_id == job.id,  # pyright: ignore[reportArgumentType]
        )
    )
    application = result.scalar_one()
    assert application.status == ApplicationStatus.NEW
    assert application.candidate_id == candidate.id
    assert application.job_id == job.id


@pytest.mark.asyncio
@patch("src.services.candidates.enqueue_email_task")
async def test_create_candidate_profile_sends_admin_email(
    mock_enqueue_email,
    session: AsyncSession,
    company_with_user,
):
    """Test that email notification is sent to admins when candidate applies."""
    mock_enqueue_email.return_value = "test-job-id"

    # Create admin user
    from src.core.infrastructure.security import get_password_hash
    from src.enums import UserRole
    from src.models import User

    admin = User(
        email="admin@test.com",
        hashed_password=get_password_hash("password"),
        role=UserRole.ADMIN,
        is_active=True,
    )
    session.add(admin)
    await session.commit()

    # Create a published job
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
    assert job.id is not None

    # Create candidate
    candidate_data = CandidateProfileCreate(
        full_name="John Doe",
        email="john@example.com",
        phone="123-456-7890",
    )

    await create_candidate_profile(
        candidate_data=candidate_data,
        job_id=job.id,
        session=session,
    )

    # Verify email was sent
    mock_enqueue_email.assert_called_once()
    call_args = mock_enqueue_email.call_args
    # Function is called with keyword arguments
    assert call_args.kwargs["to"] == ["admin@test.com"]  # Admin email
    assert "New Application" in call_args.kwargs["subject"]  # Subject
    assert "John Doe" in call_args.kwargs["body"]  # Body contains candidate name
    assert (
        "Senior Python Developer" in call_args.kwargs["body"]
    )  # Body contains job title


@pytest.mark.asyncio
async def test_create_candidate_profile_job_not_found(session: AsyncSession):
    """Test creating a candidate profile for non-existent job."""
    candidate_data = CandidateProfileCreate(
        full_name="John Doe",
        email="john@example.com",
    )

    with pytest.raises(JobNotFoundError, match="Job with ID 999 not found"):
        await create_candidate_profile(
            candidate_data=candidate_data,
            job_id=999,  # Non-existent job ID
            session=session,
        )


@pytest.mark.asyncio
async def test_create_candidate_profile_session_required():
    """Test that create_candidate_profile requires a session."""
    candidate_data = CandidateProfileCreate(
        full_name="John Doe",
        email="john@example.com",
    )

    with pytest.raises(ValueError, match="Database session is required"):
        await create_candidate_profile(
            candidate_data=candidate_data,
            job_id=1,
            session=None,  # type: ignore[arg-type]
        )
