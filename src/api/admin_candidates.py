"""Admin endpoints for candidate management."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.infrastructure.database import get_session
from src.core.infrastructure.dependencies import get_current_admin
from src.models import User
from src.schemas import CandidateProfileRead
from src.services.candidates_admin import list_candidates

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/candidates", response_model=list[CandidateProfileRead])
async def get_candidates(
    current_admin: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_session),
) -> list[CandidateProfileRead]:
    """List all candidate profiles, newest first. Requires admin authentication."""
    return await list_candidates(session)
