"""Resume download endpoint — serves files from local storage or redirects to S3 presigned URL."""

import re
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse, RedirectResponse, Response

from src.core.infrastructure.config import settings
from src.core.infrastructure.dependencies import get_current_admin
from src.core.services.storage import get_storage_provider
from src.models import User

router = APIRouter(prefix="/api/resumes", tags=["resumes"])

# UUID key + extension — no slashes or traversal sequences allowed
_SAFE_KEY = re.compile(r"^[\w.\-]+$")


@router.get("/{file_key}")
async def download_resume(
    file_key: str,
    _: User = Depends(get_current_admin),
) -> Response:
    """Download a candidate resume.

    For local storage: streams the file directly.
    For S3: redirects (302) to a 1-hour presigned URL.
    Requires admin authentication.
    """
    if not _SAFE_KEY.match(file_key):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file key",
        )

    storage = get_storage_provider()

    if settings.storage_provider == "local":
        file_path = Path(settings.local_storage_path) / file_key
        if not file_path.exists() or not file_path.is_file():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found",
            )
        return FileResponse(path=file_path, filename=file_key)

    try:
        url = await storage.get_file_url(file_key)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found",
        ) from e
    return RedirectResponse(url=url, status_code=status.HTTP_302_FOUND)
