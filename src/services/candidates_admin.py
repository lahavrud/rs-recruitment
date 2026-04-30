"""Admin service functions for candidate management."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models import CandidateProfile
from src.schemas import CandidateProfileRead


async def list_candidates(session: AsyncSession) -> list[CandidateProfileRead]:
    result = await session.execute(
        select(CandidateProfile).order_by(CandidateProfile.created_at.desc())  # pyright: ignore[reportArgumentType]
    )
    return [CandidateProfileRead.model_validate(c) for c in result.scalars().all()]
