"""Candidate endpoints for public application form."""

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Request,
    UploadFile,
    status,
)
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.infrastructure.database import get_session
from src.core.infrastructure.dependencies import (
    client_ip,
    get_current_user_optional,
)
from src.core.infrastructure.error_handling import service_exception_to_http
from src.core.infrastructure.transactions import transactional
from src.enums import UserRole
from src.models import User
from src.schemas import CandidateProfileCreate, CandidateProfileRead
from src.schemas.auth import _validate_password_complexity
from src.services.exceptions import (
    ApplicationAlreadyEditableError,
    ApplicationAlreadyExistsError,
    ApplicationAlreadyLockedError,
    EmailAlreadyExistsError,
    JobNotFoundError,
)
from src.services.public.applications import create_candidate_profile

router = APIRouter(prefix="/api/candidates", tags=["candidates"])
jobs_apply_router = APIRouter(prefix="/api/jobs", tags=["jobs"])


def _validate_optional_password(
    password: str | None, password_confirm: str | None
) -> None:
    """Sprint 11 / #606 claim path: enforce #605's password rules on the
    multipart form fields since there's no Pydantic schema on this surface."""
    if password is None:
        return
    if password != password_confirm:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="passwords_do_not_match",
        )
    try:
        _validate_password_complexity(password)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e),
        ) from e


async def _apply_common(
    job_id: int,
    full_name: str,
    email: str,
    phone: str,
    linkedin_url: str | None,
    service_concept: str | None,
    salary_expectations: str | None,
    growth_area: str | None,
    strength: str | None,
    privacy_accepted: bool,
    terms_accepted: bool,
    resume: UploadFile | None,
    password: str | None,
    password_confirm: str | None,
    request: Request,
    session: AsyncSession,
    current_user: User | None,
) -> CandidateProfileRead:
    # Logged-in candidate: consent was captured at activation time (#605).
    # Anonymous: both checkboxes are required.
    if current_user is None:
        if not privacy_accepted:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="privacy_consent_required",
            )
        if not terms_accepted:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="terms_consent_required",
            )

    if current_user is not None and current_user.role != UserRole.CANDIDATE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="only_candidates_can_apply",
        )

    # Claim-by-password is only meaningful on the anonymous path. Ignore
    # it when authed — the user already has an account.
    effective_password = password if current_user is None else None
    if effective_password is not None:
        _validate_optional_password(effective_password, password_confirm)

    resume_file: bytes | None = None
    resume_filename: str | None = None
    if resume is not None:
        resume_file = await resume.read()
        resume_filename = resume.filename

    candidate_data = CandidateProfileCreate(
        full_name=full_name,
        email=email,
        phone=phone,
        linkedin_url=linkedin_url,
    )

    try:
        async with transactional(session):
            candidate = await create_candidate_profile(
                candidate_data=candidate_data,
                job_id=job_id,
                resume_file=resume_file,
                resume_filename=resume_filename,
                session=session,
                consent_ip=client_ip(request),
                consent_ua=request.headers.get("user-agent"),
                service_concept=service_concept,
                salary_expectations=salary_expectations,
                strength=strength,
                growth_area=growth_area,
                candidate_user=current_user,
                claim_password=effective_password,
            )
        return candidate
    except ApplicationAlreadyEditableError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "error_code": "already_applied_editable",
                "application_id": e.application_id,
            },
        ) from e
    except ApplicationAlreadyLockedError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"error_code": "already_applied_locked"},
        ) from e
    except EmailAlreadyExistsError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"error_code": "email_already_registered"},
        ) from e
    except (
        JobNotFoundError,
        ApplicationAlreadyExistsError,
    ) as e:
        raise service_exception_to_http(e) from e
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="invalid_application",
        ) from e


@router.post(
    "/apply",
    response_model=CandidateProfileRead,
    status_code=status.HTTP_201_CREATED,
)
async def apply_to_job(
    request: Request,
    job_id: int = Form(...),
    full_name: str = Form(...),
    email: str = Form(...),
    phone: str = Form(...),
    linkedin_url: str | None = Form(None),
    service_concept: str | None = Form(None),
    salary_expectations: str | None = Form(None),
    growth_area: str | None = Form(None),
    strength: str | None = Form(None),
    privacy_accepted: bool = Form(...),
    terms_accepted: bool = Form(...),
    resume: UploadFile | None = File(None),
    password: str | None = Form(None),
    password_confirm: str | None = Form(None),
    session: AsyncSession = Depends(get_session),
    current_user: User | None = Depends(get_current_user_optional),
) -> CandidateProfileRead:
    return await _apply_common(
        job_id=job_id,
        full_name=full_name,
        email=email,
        phone=phone,
        linkedin_url=linkedin_url,
        service_concept=service_concept,
        salary_expectations=salary_expectations,
        growth_area=growth_area,
        strength=strength,
        privacy_accepted=privacy_accepted,
        terms_accepted=terms_accepted,
        resume=resume,
        password=password,
        password_confirm=password_confirm,
        request=request,
        session=session,
        current_user=current_user,
    )


@jobs_apply_router.post(
    "/{job_id}/apply",
    response_model=CandidateProfileRead,
    status_code=status.HTTP_201_CREATED,
)
async def apply_to_job_by_path(
    job_id: int,
    request: Request,
    full_name: str = Form(...),
    email: str = Form(...),
    phone: str = Form(...),
    linkedin_url: str | None = Form(None),
    service_concept: str | None = Form(None),
    salary_expectations: str | None = Form(None),
    growth_area: str | None = Form(None),
    strength: str | None = Form(None),
    privacy_accepted: bool = Form(...),
    terms_accepted: bool = Form(...),
    resume: UploadFile | None = File(None),
    password: str | None = Form(None),
    password_confirm: str | None = Form(None),
    session: AsyncSession = Depends(get_session),
    current_user: User | None = Depends(get_current_user_optional),
) -> CandidateProfileRead:
    return await _apply_common(
        job_id=job_id,
        full_name=full_name,
        email=email,
        phone=phone,
        linkedin_url=linkedin_url,
        service_concept=service_concept,
        salary_expectations=salary_expectations,
        growth_area=growth_area,
        strength=strength,
        privacy_accepted=privacy_accepted,
        terms_accepted=terms_accepted,
        resume=resume,
        password=password,
        password_confirm=password_confirm,
        request=request,
        session=session,
        current_user=current_user,
    )
