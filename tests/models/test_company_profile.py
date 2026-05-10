"""Tests for CompanyProfile model."""

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.infrastructure.security import get_password_hash
from src.enums import UserRole
from src.models import CompanyProfile, User


def _required_fields() -> dict:
    return {
        "name": "Test Company",
        "company_id": "123456789",
        "address": "רח׳ הדוגמה 1, תל אביב",
        "contact_first_name": "ישראל",
        "contact_last_name": "ישראלי",
        "contact_mobile_phone": "0501234567",
    }


@pytest.mark.asyncio
async def test_company_profile_creation_with_required_fields(session: AsyncSession):
    """Test CompanyProfile creation with all required fields populated."""
    user = User(
        email="company@example.com",
        hashed_password=get_password_hash("password"),
        role=UserRole.COMPANY,
        is_active=True,
    )
    session.add(user)
    await session.flush()
    assert user.id is not None

    company = CompanyProfile(user_id=user.id, **_required_fields())
    session.add(company)
    await session.commit()
    await session.refresh(company)

    assert company.id is not None
    assert company.user_id == user.id
    assert company.name == "Test Company"
    assert company.company_id == "123456789"
    assert company.address == "רח׳ הדוגמה 1, תל אביב"
    assert company.contact_first_name == "ישראל"
    assert company.contact_last_name == "ישראלי"
    assert company.contact_mobile_phone == "0501234567"
    assert company.logo_url is None
    assert company.contact_landline_phone is None
    assert company.created_at is not None


@pytest.mark.asyncio
async def test_company_profile_default_values(session: AsyncSession):
    """Test CompanyProfile default values for optional columns."""
    user = User(
        email="defaults@example.com",
        hashed_password=get_password_hash("password"),
        role=UserRole.COMPANY,
        is_active=True,
    )
    session.add(user)
    await session.flush()
    assert user.id is not None

    company = CompanyProfile(user_id=user.id, **_required_fields())
    session.add(company)
    await session.commit()
    await session.refresh(company)

    assert company.created_at is not None
    assert company.logo_url is None
    assert company.contact_landline_phone is None
    assert company.agreement_signed_at is None
    assert company.privacy_accepted_at is None


@pytest.mark.asyncio
async def test_company_profile_allows_null_user_id(session: AsyncSession):
    """Admin-created companies can exist without a linked user."""
    company = CompanyProfile(**_required_fields() | {"name": "Admin-Only Company"})
    session.add(company)
    await session.commit()
    await session.refresh(company)

    assert company.id is not None
    assert company.user_id is None
    assert company.name == "Admin-Only Company"
