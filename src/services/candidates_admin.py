"""Admin service functions for candidate management."""

import logging

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.infrastructure.pagination import (
    CursorPage,
    apply_cursor,
    build_cursor_page,
    clamp_limit,
)
from src.core.services.storage import get_storage_provider
from src.models import Application, CandidateProfile
from src.schemas import CandidateProfileRead, CandidateProfileUpdate
from src.services.exceptions import CandidateNotFoundError

_logger = logging.getLogger(__name__)


async def list_candidates(
    session: AsyncSession,
    *,
    cursor: str | None = None,
    limit: int | None = None,
) -> CursorPage[CandidateProfileRead]:
    """Return one page of candidate profiles, newest first."""
    page_size = clamp_limit(limit)
    query = apply_cursor(
        select(CandidateProfile),
        sort_col=CandidateProfile.created_at,  # pyright: ignore[reportArgumentType]
        id_col=CandidateProfile.id,  # pyright: ignore[reportArgumentType]
        cursor=cursor,
        limit=page_size,
    )
    rows = (await session.execute(query)).scalars().all()
    return build_cursor_page(
        list(rows),
        serializer=CandidateProfileRead.model_validate,
        cursor_key=lambda c: (c.created_at, c.id),
        limit=page_size,
    )


async def get_candidate(
    candidate_id: int, session: AsyncSession
) -> CandidateProfileRead:
    """Fetch a single candidate profile by id.

    Raises:
        CandidateNotFoundError: If no candidate with that id exists.
    """
    result = await session.execute(
        select(CandidateProfile).where(CandidateProfile.id == candidate_id)  # pyright: ignore[reportArgumentType]
    )
    candidate = result.scalar_one_or_none()
    if candidate is None:
        raise CandidateNotFoundError(f"Candidate {candidate_id} not found")
    return CandidateProfileRead.model_validate(candidate)


async def update_candidate(
    candidate_id: int,
    data: CandidateProfileUpdate,
    session: AsyncSession,
) -> CandidateProfileRead:
    """Apply a partial update to a candidate profile.

    Raises:
        CandidateNotFoundError: If no candidate with that id exists.
    """
    result = await session.execute(
        select(CandidateProfile).where(CandidateProfile.id == candidate_id)  # pyright: ignore[reportArgumentType]
    )
    candidate = result.scalar_one_or_none()
    if candidate is None:
        raise CandidateNotFoundError(f"Candidate {candidate_id} not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(candidate, field, value)

    await session.flush()
    await session.refresh(candidate)
    return CandidateProfileRead.model_validate(candidate)


async def delete_candidate(candidate_id: int, session: AsyncSession) -> None:
    """Hard-delete a candidate, cascading through their applications.

    Best-effort delete of the latest resume snapshot from storage. Failures
    on the storage delete are logged and ignored — DB state stays consistent.

    Raises:
        CandidateNotFoundError: If no candidate with that id exists.
    """
    result = await session.execute(
        select(CandidateProfile).where(CandidateProfile.id == candidate_id)  # pyright: ignore[reportArgumentType]
    )
    candidate = result.scalar_one_or_none()
    if candidate is None:
        raise CandidateNotFoundError(f"Candidate {candidate_id} not found")

    await session.execute(
        delete(Application).where(Application.candidate_id == candidate_id)  # pyright: ignore[reportArgumentType]
    )

    if candidate.resume_path:
        try:
            await get_storage_provider().delete_file(candidate.resume_path)
        except Exception:
            _logger.exception(
                "Failed to delete candidate resume file %s", candidate.resume_path
            )

    await session.delete(candidate)
    await session.flush()
