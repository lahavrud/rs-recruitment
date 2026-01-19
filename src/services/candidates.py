"""Candidate service layer for public application form."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.services.storage import StorageProvider, get_storage_provider
from src.core.tasks import enqueue_email_task
from src.enums import ApplicationStatus
from src.models import Application, CandidateProfile, Job
from src.schemas import CandidateProfileCreate, CandidateProfileRead
from src.services.admin import get_all_admin_emails
from src.services.exceptions import JobNotFoundError


async def create_candidate_profile(
    candidate_data: CandidateProfileCreate,
    job_id: int,
    resume_file: bytes | None = None,
    resume_filename: str | None = None,
    session: AsyncSession | None = None,
) -> CandidateProfileRead:
    """Create a candidate profile and application for a job.

    This is the main service method for the public application form.
    It handles:
    - Creating the CandidateProfile record
    - Uploading resume file (if provided) via storage service
    - Creating the Application record linking candidate to job
    - Sending email notification to all admins

    Args:
        candidate_data: Candidate profile data from form
        job_id: ID of the job being applied to
        resume_file: Optional resume file content (bytes)
        resume_filename: Optional resume file name
        session: Database session (required)

    Returns:
        Created CandidateProfile as CandidateProfileRead schema

    Raises:
        ValueError: If session is not provided
        JobNotFoundError: If job with job_id does not exist
        ValueError: If file upload fails
    """
    if session is None:
        raise ValueError("Database session is required")

    # Verify job exists
    result = await session.execute(
        select(Job).where(Job.id == job_id)  # pyright: ignore[reportArgumentType]
    )
    job = result.scalar_one_or_none()
    if not job:
        raise JobNotFoundError(f"Job with ID {job_id} not found")

    # Load company profile for email notification
    from src.models import CompanyProfile

    company_result = await session.execute(
        select(CompanyProfile).where(  # pyright: ignore[reportArgumentType]
            CompanyProfile.id == job.company_id
        )
    )
    company = company_result.scalar_one_or_none()
    company_name = company.name if company else "Unknown Company"

    # Handle resume file upload if provided
    resume_path: str | None = None
    if resume_file is not None and resume_filename is not None:
        try:
            # Validate file type (PDF, DOC, DOCX)
            allowed_extensions = {".pdf", ".doc", ".docx"}
            file_extension = (
                resume_filename.lower().split(".")[-1] if "." in resume_filename else ""
            )
            if f".{file_extension}" not in allowed_extensions:
                raise ValueError(
                    f"Invalid file type. Allowed types: PDF, DOC, DOCX. "
                    f"Got: {file_extension}"
                )

            # Validate file size (max 10MB)
            max_size = 10 * 1024 * 1024  # 10MB in bytes
            if len(resume_file) > max_size:
                raise ValueError(
                    f"File size exceeds maximum of 10MB. Got: {len(resume_file)} bytes"
                )

            # Upload file via storage service
            storage_provider: StorageProvider = get_storage_provider()
            file_identifier = await storage_provider.upload_file(
                file_content=resume_file,
                file_name=resume_filename,
                content_type="application/pdf"
                if file_extension == "pdf"
                else "application/msword",
            )

            # Store the file identifier as resume_path
            # For local storage, this will be the file key
            # For S3, this will be the S3 object key
            resume_path = file_identifier
        except Exception as e:
            raise ValueError(f"Failed to upload resume file: {e}") from e

    # Create CandidateProfile
    candidate = CandidateProfile(
        full_name=candidate_data.full_name,
        email=candidate_data.email,
        phone=candidate_data.phone,
        resume_path=resume_path,
        linkedin_url=candidate_data.linkedin_url,
        service_concept=candidate_data.service_concept,
        salary_expectations=candidate_data.salary_expectations,
        military_service_details=candidate_data.military_service_details,
        transportation=candidate_data.transportation,
        personality_weakness=candidate_data.personality_weakness,
        personality_strength=candidate_data.personality_strength,
    )

    session.add(candidate)
    await session.flush()  # Flush to get candidate.id

    # Create Application record (linking candidate to job)
    application = Application(
        job_id=job_id,
        candidate_id=candidate.id,  # type: ignore[arg-type]
        status=ApplicationStatus.NEW,  # Admin as Gatekeeper: starts as NEW
    )

    session.add(application)
    await session.commit()

    # Send email notification to all admins (async task)
    admin_emails = await get_all_admin_emails(session)
    if admin_emails:
        email_subject = (
            f"New Application: {candidate.full_name} applied for {job.title}"
        )
        email_body = f"""
A new candidate application has been submitted:

Candidate: {candidate.full_name}
Email: {candidate.email}
Phone: {candidate.phone or "Not provided"}
LinkedIn: {candidate.linkedin_url or "Not provided"}

Job: {job.title} (ID: {job.id})
Company: {company_name}

Application Status: NEW (requires admin approval)

Please review the application in the admin dashboard.
"""
        await enqueue_email_task(
            to=admin_emails,
            subject=email_subject,
            body=email_body,
        )

    # Refresh candidate to ensure all fields are loaded
    await session.refresh(candidate)

    return CandidateProfileRead.model_validate(candidate)
