"""Admin service functions for candidate management."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.infrastructure.pagination import (
    CursorPage,
    apply_cursor,
    build_cursor_page,
    clamp_limit,
)
from src.models import CandidateProfile
from src.schemas import CandidateProfileRead


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
