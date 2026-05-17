"""Tests for src/services/companies.py."""

from unittest.mock import AsyncMock

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from src.models import CompanyProfile, Job, User
from src.services.company.profile import _resolve_url, export_company_data


@pytest.mark.asyncio
async def test_resolve_url_returns_none_for_empty_identifier():
    """Empty identifiers should not call storage at all."""
    storage = AsyncMock()
    assert await _resolve_url(storage, None) is None
    assert await _resolve_url(storage, "") is None
    storage.get_file_url.assert_not_called()


@pytest.mark.asyncio
async def test_resolve_url_returns_none_on_storage_failure():
    """Storage errors should not abort the export — return None instead."""
    storage = AsyncMock()
    storage.get_file_url.side_effect = RuntimeError("S3 down")
    assert await _resolve_url(storage, "some/key.pdf") is None


@pytest.mark.asyncio
async def test_export_company_data_includes_jobs(
    session: AsyncSession,
    approved_company_user: User,
    company_profile: CompanyProfile,
    pending_job: Job,
):
    """The export payload includes the company's jobs and presigned URLs."""
    storage = AsyncMock()
    storage.get_file_url.return_value = "https://example/presigned"

    payload = await export_company_data(
        approved_company_user, company_profile, session, storage
    )

    assert payload.user.id == approved_company_user.id
    assert payload.company_profile.id == company_profile.id
    assert any(j.id == pending_job.id for j in payload.jobs)
