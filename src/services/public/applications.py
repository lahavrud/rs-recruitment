"""Application service layer: the public apply-to-job flow.

Separate from `candidates.py` (profile lookup + update primitives) so
that the heavyweight create-application code path — file validation,
storage upload, upsert, and email side effects — lives in a focused
module.
"""

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.core.infrastructure.config import settings
from src.core.infrastructure.transactions import defer_after_commit
from src.core.services.file_validation import validate_document_magic_bytes
from src.core.services.storage import StorageProvider, get_storage_provider
from src.core.tasks import enqueue_email_task
from src.enums import ApplicationStatus, UserRole
from src.models import Application, CandidateProfile, Job, User
from src.schemas import CandidateProfileCreate, CandidateProfileRead
from src.services.admin.companies import get_all_admin_emails
from src.services.company.candidates import (
    find_candidate_by_email,
    update_candidate_profile,
)
from src.services.exceptions import (
    ApplicationAlreadyEditableError,
    ApplicationAlreadyLockedError,
    EmailAlreadyExistsError,
    JobNotFoundError,
)
from src.services.utils.audit import record_audit_event
from src.services.utils.legal import (
    CURRENT_PRIVACY_POLICY_VERSION,
    CURRENT_TERMS_OF_SERVICE_VERSION,
)
from src.templates.email import (
    build_application_received_html,
    build_new_application_admin_html,
)

_ALLOWED_EXTENSIONS = {".pdf", ".doc", ".docx"}
_MAX_RESUME_BYTES = 10 * 1024 * 1024  # 10 MB
_MIME_BY_EXT = {
    "pdf": "application/pdf",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "doc": "application/msword",
}


async def _validate_and_upload_resume(
    resume_file: bytes,
    resume_filename: str,
    storage: StorageProvider,
) -> str:
    """Validate resume file (type, size, magic bytes) and upload it.

    Returns the storage file key. Raises ValueError on any validation failure.
    """
    ext = resume_filename.lower().rsplit(".", 1)[-1] if "." in resume_filename else ""
    if f".{ext}" not in _ALLOWED_EXTENSIONS:
        raise ValueError(f"Invalid file type. Allowed: PDF, DOC, DOCX. Got: {ext}")
    if len(resume_file) > _MAX_RESUME_BYTES:
        raise ValueError(
            f"File size exceeds maximum of 10MB. Got: {len(resume_file)} bytes"
        )
    if not validate_document_magic_bytes(resume_file, ext):
        raise ValueError("Resume file content does not match the declared file type")

    content_type = _MIME_BY_EXT.get(ext, "application/octet-stream")
    return await storage.upload_file(
        file_content=resume_file,
        file_name=f"resumes/{resume_filename}",
        content_type=content_type,
    )


async def _check_no_blocking_application(
    session: AsyncSession, job_id: int, candidate_id: int
) -> None:
    """Reject re-apply when a non-WITHDRAWN application already exists.

    Sprint 11 / #606 + #604 amendment:
    * NEW   → ``ApplicationAlreadyEditableError`` (carries application_id so
      the frontend can redirect to the inline editor in #610).
    * APPROVED_BY_ADMIN / REJECTED / HIRED → ``ApplicationAlreadyLockedError``
      (no application_id — candidates never see admin-internal status, so
      we don't surface a navigable handle to a locked record).
    * WITHDRAWN → allow re-apply (partial unique index already permits the
      new row).
    """
    result = await session.execute(
        select(Application).where(  # pyright: ignore[reportArgumentType]
            Application.job_id == job_id,
            Application.candidate_id == candidate_id,
            Application.status != ApplicationStatus.WITHDRAWN,
        )
    )
    existing = result.scalar_one_or_none()
    if existing is None:
        return
    if existing.status == ApplicationStatus.NEW:
        assert existing.id is not None
        raise ApplicationAlreadyEditableError(application_id=existing.id)
    raise ApplicationAlreadyLockedError(
        f"Application {existing.id} is no longer editable"
    )


async def _upsert_candidate_and_application(
    session: AsyncSession,
    candidate_data: CandidateProfileCreate,
    job_id: int,
    resume_path: str | None,
    consent_ip: str | None,
    consent_ua: str | None,
    service_concept: str | None = None,
    salary_expectations: str | None = None,
    strength: str | None = None,
    growth_area: str | None = None,
    skip_consent_write: bool = False,
    candidate_user: User | None = None,
) -> CandidateProfile:
    """Find-or-create the candidate profile and create the application row.

    Order matters: pre-checks (active-user-by-email, duplicate-apply) MUST
    run before any profile field is mutated, otherwise a 409 leaves the
    profile half-updated with the new request's name/phone/linkedin
    overwriting whatever the candidate had before.

    Raises:
        EmailAlreadyExistsError: when the email belongs to an *active*
            candidate user — the apply form should send them to login
            instead (Sprint 11 / #606).
        ApplicationAlreadyEditableError / ApplicationAlreadyLockedError:
            when a non-WITHDRAWN application already exists for this
            (job_id, candidate). NEW → editable (carries id); other
            non-WITHDRAWN statuses → locked.

    Returns the CandidateProfile (not yet committed).
    """
    # Pre-check 1: an existing active candidate User with this email blocks
    # anonymous apply entirely — the frontend prompts the visitor to log in
    # (#606). Pending (is_active=False) users are silently ignored here so
    # they can keep applying anonymously while their activation is in flight.
    # Skipped when the caller IS that user (authed candidate apply path).
    if candidate_user is None:
        user_result = await session.execute(
            select(User).where(User.email == candidate_data.email)  # type: ignore[arg-type]
        )
        matching_user = user_result.scalar_one_or_none()
        if (
            matching_user is not None
            and matching_user.is_active
            and matching_user.role == UserRole.CANDIDATE
        ):
            raise EmailAlreadyExistsError(candidate_data.email)

    # Pre-check 2: duplicate-apply (excluding WITHDRAWN). This needs to fire
    # BEFORE we mutate any existing candidate profile, otherwise a 409 leaves
    # the profile's name/phone/linkedin silently overwritten with the new
    # request's values.
    now = datetime.now(timezone.utc)
    existing = await find_candidate_by_email(
        email=candidate_data.email, session=session
    )
    if existing and existing.id is not None:
        await _check_no_blocking_application(session, job_id, existing.id)

        candidate = await update_candidate_profile(
            candidate=existing,
            candidate_data=candidate_data,
            resume_path=resume_path,
            session=session,
        )
        if not skip_consent_write:
            candidate.consent_given_at = now
            candidate.consent_policy_version = CURRENT_PRIVACY_POLICY_VERSION
            candidate.consent_ip = consent_ip
            candidate.consent_user_agent = consent_ua
            candidate.tos_accepted_at = now
            candidate.tos_version = CURRENT_TERMS_OF_SERVICE_VERSION
        await session.flush()
    else:
        candidate = CandidateProfile(
            full_name=candidate_data.full_name,
            email=candidate_data.email,
            phone=candidate_data.phone,
            resume_path=resume_path,
            linkedin_url=candidate_data.linkedin_url,
            consent_given_at=None if skip_consent_write else now,
            consent_policy_version=(
                None if skip_consent_write else CURRENT_PRIVACY_POLICY_VERSION
            ),
            consent_ip=None if skip_consent_write else consent_ip,
            consent_user_agent=None if skip_consent_write else consent_ua,
            tos_accepted_at=None if skip_consent_write else now,
            tos_version=(
                None if skip_consent_write else CURRENT_TERMS_OF_SERVICE_VERSION
            ),
        )
        session.add(candidate)
        await session.flush()

    # Snapshot the resume on Application — independent of CandidateProfile's
    # `latest` resume (per #604 schema, fixes the missing snapshot write that
    # silently shipped before #606).
    session.add(
        Application(
            job_id=job_id,
            candidate_id=candidate.id,  # type: ignore[arg-type]
            status=ApplicationStatus.NEW,
            service_concept=service_concept,
            salary_expectations=salary_expectations,
            strength=strength,
            growth_area=growth_area,
            resume_path=resume_path,
        )
    )
    return candidate


async def _send_application_emails(
    candidate: CandidateProfile,
    job: Job,
    company_name: str,
    session: AsyncSession,
) -> None:
    """Enqueue confirmation email to the candidate and notification to admins."""
    await enqueue_email_task(
        to=candidate.email,
        subject=f"מועמדותך למשרת '{job.title}' התקבלה",
        body=(
            f"שלום {candidate.full_name},\n\n"
            f"קיבלנו את מועמדותך למשרת '{job.title}'. צוות RS Recruiting "
            "יבחן את הפרטים בקרוב ויחזור אליך עם עדכון."
        ),
        html_body=build_application_received_html(
            candidate_name=candidate.full_name,
            job_title=job.title,
        ),
    )

    if settings.admin_notification_email:
        admin_recipients: list[str] | str = settings.admin_notification_email
    else:
        admin_recipients = await get_all_admin_emails(session)

    if admin_recipients:
        admin_url = f"{settings.frontend_base_url}/login?redirect=/admin/applications"
        await enqueue_email_task(
            to=admin_recipients,
            subject=f"מועמדות חדשה למשרת '{job.title}' — {candidate.full_name}",
            body=(
                f"מועמדות חדשה התקבלה:\n\n"
                f"שם: {candidate.full_name}\n"
                f'דוא"ל: {candidate.email}\n'
                f"טלפון: {candidate.phone or 'לא צויין'}\n"
                f"משרה: {job.title}\n"
                f"חברה: {company_name}\n\n"
                f"מעבר לניהול: {admin_url}"
            ),
            html_body=build_new_application_admin_html(
                candidate_name=candidate.full_name,
                candidate_email=candidate.email,
                candidate_phone=candidate.phone,
                candidate_linkedin=candidate.linkedin_url,
                job_title=job.title,
                company_name=company_name,
                admin_url=admin_url,
            ),
        )


async def create_candidate_profile(
    candidate_data: CandidateProfileCreate,
    job_id: int,
    resume_file: bytes | None = None,
    resume_filename: str | None = None,
    session: AsyncSession | None = None,
    consent_ip: str | None = None,
    consent_ua: str | None = None,
    service_concept: str | None = None,
    salary_expectations: str | None = None,
    strength: str | None = None,
    growth_area: str | None = None,
    *,
    candidate_user: User | None = None,
    claim_password: str | None = None,
) -> CandidateProfileRead:
    """Create a candidate profile and application for a job.

    Three flavors, dispatched by the (``candidate_user``, ``claim_password``)
    combo (Sprint 11 / #606):

    * Anonymous apply (no user, no password) — existing behavior.
    * Anonymous claim (no user, password supplied) — submit the application
      AND register a candidate User in the same request. Activation token is
      minted and emailed via the shared #605 helper. If the email is already
      taken by an active candidate user the apply is rejected upfront with
      ``EmailAlreadyExistsError`` and the password is irrelevant.
    * Logged-in candidate apply (user supplied) — use ``user.email`` instead
      of the form's email, snapshot the new resume on the Application,
      sync any updated identity fields onto the candidate's existing
      profile, and skip per-application consent writes (consent was already
      captured at activation time per #605).

    Raises:
        ValueError: If session is missing or file upload fails.
        JobNotFoundError: If the job does not exist.
        EmailAlreadyExistsError: If apply email belongs to an active
            candidate user (#606 active-user check).
        ApplicationAlreadyEditableError / ApplicationAlreadyLockedError: per
            ``_check_no_blocking_application``.
    """
    if session is None:
        raise ValueError("Database session is required")

    job_row = await session.execute(
        select(Job).options(selectinload(Job.company)).where(Job.id == job_id)  # pyright: ignore[reportArgumentType]
    )
    job = job_row.scalar_one_or_none()
    if not job:
        raise JobNotFoundError(f"Job with ID {job_id} not found")

    company_name = job.company.name if job.company else "Unknown Company"

    # Logged-in candidates ignore the form's email field (it could mismatch
    # their session email and would let one user spoof another's submission).
    if candidate_user is not None:
        candidate_data = candidate_data.model_copy(
            update={"email": candidate_user.email}
        )

    resume_path: str | None = None
    if resume_file is not None and resume_filename is not None:
        try:
            resume_path = await _validate_and_upload_resume(
                resume_file, resume_filename, get_storage_provider()
            )
        except Exception as e:
            raise ValueError(f"Failed to upload resume file: {e}") from e

    candidate = await _upsert_candidate_and_application(
        session,
        candidate_data,
        job_id,
        resume_path,
        consent_ip,
        consent_ua,
        service_concept=service_concept,
        salary_expectations=salary_expectations,
        strength=strength,
        growth_area=growth_area,
        # Logged-in flow already has consent on the profile — don't overwrite
        # the activation-time IP/UA with the current (possibly different
        # device's) values.
        skip_consent_write=candidate_user is not None,
        candidate_user=candidate_user,
    )

    # Logged-in candidate → ensure the profile is linked to their User row
    # (defensive; activation should have done this already).
    if candidate_user is not None and candidate.user_id is None:
        candidate.user_id = candidate_user.id

    await session.flush()
    await session.refresh(candidate)

    # Audit only the per-application consent capture path — claim/logged-in
    # flows have their own audit (candidate_register_via_apply / activation).
    if candidate_user is None:
        await record_audit_event(
            session,
            actor_user_id=None,
            action="candidate.consent",
            target_type="CandidateProfile",
            target_id=candidate.id,  # type: ignore[arg-type]
            detail=f"policy_version={CURRENT_PRIVACY_POLICY_VERSION}",
            ip_address=consent_ip,
        )
        await record_audit_event(
            session,
            actor_user_id=None,
            action="candidate.terms_accept",
            target_type="CandidateProfile",
            target_id=candidate.id,  # type: ignore[arg-type]
            detail=f"terms_version={CURRENT_TERMS_OF_SERVICE_VERSION}",
            ip_address=consent_ip,
        )

    # Anonymous claim: mint a candidate User + activation token using the
    # shared #605 helper. The User starts is_active=False; the candidate's
    # CandidateProfile.user_id stays NULL until activation links them.
    # If the email belongs to an already-pending user the helper updates the
    # password + replaces the token (re-registration semantics, #605).
    if candidate_user is None and claim_password is not None:
        # Lazy import to avoid a circular dep at module load (auth →
        # public → auth).
        from src.services.auth.candidate_registration import register_candidate

        try:
            await register_candidate(
                candidate_data.email,
                claim_password,
                candidate_data.full_name,
                privacy_accepted=True,
                terms_accepted=True,
                session=session,
                ip_address=consent_ip,
                user_agent=consent_ua,
            )
            await record_audit_event(
                session,
                actor_user_id=None,
                action="candidate_register_via_apply",
                target_type="CandidateProfile",
                target_id=candidate.id,  # type: ignore[arg-type]
                ip_address=consent_ip,
            )
        except EmailAlreadyExistsError:
            # Race: a registration landed between our pre-check and here.
            # Surface to the caller so the apply also fails cleanly.
            raise

    _candidate_snapshot = candidate
    _job_snapshot = job
    _company_name_snapshot = company_name
    defer_after_commit(
        lambda: _send_application_emails(
            _candidate_snapshot, _job_snapshot, _company_name_snapshot, session
        )
    )
    return CandidateProfileRead.model_validate(candidate)
