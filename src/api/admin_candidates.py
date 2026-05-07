"""Admin endpoints for candidate management."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.infrastructure.database import get_session
from src.core.infrastructure.dependencies import get_current_admin
from src.core.infrastructure.error_handling import service_exception_to_http
from src.core.infrastructure.pagination import DEFAULT_LIMIT, MAX_LIMIT, CursorPage
from src.models import User
from src.schemas import CandidateProfileRead
from src.services.candidates_admin import list_candidates
from src.services.exceptions import InvalidCursorError

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/candidates", response_model=CursorPage[CandidateProfileRead])
async def get_candidates(
    cursor: str | None = None,
    limit: int = Query(default=DEFAULT_LIMIT, ge=1, le=MAX_LIMIT),
    current_admin: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_session),
) -> CursorPage[CandidateProfileRead]:
    """List candidate profiles, newest first.

    Forward-only cursor pagination. Pass the `next_cursor` from the previous
    response as `?cursor=` to fetch the next page. Requires admin
    authentication.
    """
    try:
        return await list_candidates(session, cursor=cursor, limit=limit)
    except InvalidCursorError as exc:
        raise service_exception_to_http(exc) from exc
