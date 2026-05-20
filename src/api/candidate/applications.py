"""Authenticated candidate read-only application endpoints (Sprint 11 / #609).

Lists, detail, and resume-snapshot streaming for the authenticated candidate's
own applications. Status and admin_notes are intentionally not exposed; the
only state signal sent back is the derived ``editable`` flag, used by the UI
to decide whether to render Edit / Withdraw buttons (those actions land in a
separate PR).
"""

from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from src.api._resume_streaming import basename_from_storage_key, stream_resume
from src.core.infrastructure.database import get_session
from src.core.infrastructure.dependencies import get_current_candidate
from src.core.infrastructure.error_handling import service_exception_to_http
from src.core.infrastructure.pagination import (
    DEFAULT_LIMIT,
    MAX_LIMIT,
    CursorPage,
)
from src.models import CandidateProfile, User
from src.schemas import (
    CandidateApplicationDetail,
    CandidateApplicationListItem,
)
from src.services.candidate.applications import (
    get_application_resume_key,
    get_my_application,
    list_my_applications,
)
from src.services.exceptions import (
    ApplicationNotFoundError,
    InvalidCursorError,
)

router = APIRouter(prefix="/api/candidate/me/applications", tags=["candidate"])


@router.get("", response_model=CursorPage[CandidateApplicationListItem])
async def list_applications(
    cursor: str | None = None,
    limit: int = Query(default=DEFAULT_LIMIT, ge=1, le=MAX_LIMIT),
    current: tuple[User, CandidateProfile] = Depends(get_current_candidate),
    session: AsyncSession = Depends(get_session),
) -> CursorPage[CandidateApplicationListItem]:
    """List the authenticated candidate's applications, newest first.

    Excludes WITHDRAWN rows (invisible per the issue's semantics).
    """
    _, profile = current
    try:
        return await list_my_applications(
            session,
            candidate_id=profile.id,  # type: ignore[arg-type]
            cursor=cursor,
            limit=limit,
        )
    except InvalidCursorError as exc:
        raise service_exception_to_http(exc) from exc


@router.get("/{application_id}", response_model=CandidateApplicationDetail)
async def get_application(
    application_id: int,
    current: tuple[User, CandidateProfile] = Depends(get_current_candidate),
    session: AsyncSession = Depends(get_session),
) -> CandidateApplicationDetail:
    """Single application detail — 404 if foreign or WITHDRAWN."""
    _, profile = current
    try:
        return await get_my_application(
            session,
            candidate_id=profile.id,  # type: ignore[arg-type]
            application_id=application_id,
        )
    except ApplicationNotFoundError as exc:
        raise service_exception_to_http(exc) from exc


@router.get("/{application_id}/resume")
async def download_application_resume(
    application_id: int,
    current: tuple[User, CandidateProfile] = Depends(get_current_candidate),
    session: AsyncSession = Depends(get_session),
) -> Response:
    """Stream the snapshotted resume tied to this application.

    Collapses foreign-id, WITHDRAWN, and no-snapshot into the same 404 so the
    endpoint can't be used to probe ownership separately from existence.
    """
    _, profile = current
    try:
        storage_key = await get_application_resume_key(
            session,
            candidate_id=profile.id,  # type: ignore[arg-type]
            application_id=application_id,
        )
    except ApplicationNotFoundError as exc:
        raise service_exception_to_http(exc) from exc
    return await stream_resume(basename_from_storage_key(storage_key))
