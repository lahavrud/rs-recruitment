"""Resume download endpoint — streams bytes from local storage or S3."""

from fastapi import APIRouter, Depends
from fastapi.responses import Response

from src.api._resume_streaming import stream_resume
from src.core.infrastructure.dependencies import get_current_admin
from src.models import User

router = APIRouter(prefix="/api/resumes", tags=["resumes"])


@router.get("/{file_key}")
async def download_resume(
    file_key: str,
    _: User = Depends(get_current_admin),
) -> Response:
    """Secure proxy: streams resume bytes from local storage or S3."""
    return await stream_resume(file_key)
