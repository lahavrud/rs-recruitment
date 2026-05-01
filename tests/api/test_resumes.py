"""Integration tests for the resume download endpoint."""

from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_download_resume_requires_admin(public_client: AsyncClient):
    """Unauthenticated clients cannot download resumes."""
    response = await public_client.get("/api/resumes/test.pdf")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_download_resume_invalid_key(admin_client: AsyncClient):
    """Returns 400 for keys containing characters outside the safe set."""
    response = await admin_client.get("/api/resumes/invalid@key.pdf")
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_download_resume_not_found(admin_client: AsyncClient, tmp_path: Path):
    """Returns 404 when the file does not exist in storage."""
    mock_settings = MagicMock()
    mock_settings.storage_provider = "local"
    mock_settings.local_storage_path = str(tmp_path)

    with patch("src.api.resumes.settings", mock_settings):
        response = await admin_client.get("/api/resumes/nonexistent.pdf")

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_download_resume_success(admin_client: AsyncClient, tmp_path: Path):
    """Returns 200 and file content for a valid existing resume."""
    fake_pdf = b"%PDF-1.4 fake content"
    (tmp_path / "resume.pdf").write_bytes(fake_pdf)

    mock_settings = MagicMock()
    mock_settings.storage_provider = "local"
    mock_settings.local_storage_path = str(tmp_path)

    with patch("src.api.resumes.settings", mock_settings):
        response = await admin_client.get("/api/resumes/resume.pdf")

    assert response.status_code == 200
    assert response.content == fake_pdf


@pytest.mark.asyncio
async def test_download_resume_s3_redirects(admin_client: AsyncClient):
    """For S3 storage, returns a redirect to the presigned URL."""
    mock_settings = MagicMock()
    mock_settings.storage_provider = "s3"

    mock_storage = MagicMock()
    mock_storage.get_file_url = MagicMock(
        return_value="https://s3.example.com/presigned"
    )
    # get_file_url is awaited, so wrap in a coroutine

    async def fake_get_url(key):  # noqa: ARG001
        return "https://s3.example.com/presigned"

    mock_storage.get_file_url = fake_get_url

    with (
        patch("src.api.resumes.settings", mock_settings),
        patch("src.api.resumes.get_storage_provider", return_value=mock_storage),
    ):
        response = await admin_client.get(
            "/api/resumes/abc123.pdf", follow_redirects=False
        )

    assert response.status_code == 302
    assert response.headers["location"] == "https://s3.example.com/presigned"
