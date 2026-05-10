"""Tests for User model."""

import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlmodel import select

from src.core.infrastructure.security import get_password_hash, verify_password
from src.enums import UserRole
from src.models import CompanyProfile, User


@pytest.mark.asyncio
async def test_user_creation_with_required_fields(session: AsyncSession):
    """Test User creation with required fields."""
    user = User(
        email="test@example.com",
        hashed_password=get_password_hash("password123"),
        role=UserRole.COMPANY,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)

    assert user.id is not None
    assert user.email == "test@example.com"
    assert user.role == UserRole.COMPANY
    assert user.is_active is False  # Default value
    assert user.created_at is not None

    # Verify password is hashed
    assert verify_password("password123", user.hashed_password)


@pytest.mark.asyncio
async def test_user_default_values(session: AsyncSession):
    """Test User default values."""
    user = User(
        email="default@example.com",
        hashed_password=get_password_hash("password"),
        role=UserRole.COMPANY,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)

    # Default values
    assert user.is_active is False
    assert user.created_at is not None


@pytest.mark.asyncio
async def test_admin_user_company_profile_is_none(session: AsyncSession):
    """ADMIN users have no CompanyProfile — relationship resolves to None.

    Pins the type annotation: User.company_profile is Optional, not required.
    """
    admin = User(
        email="admin@example.com",
        hashed_password=get_password_hash("password"),
        role=UserRole.ADMIN,
    )
    session.add(admin)
    await session.commit()

    result = await session.execute(
        select(User)
        .options(selectinload(User.company_profile))
        .where(User.email == "admin@example.com")
    )
    fetched = result.scalar_one()
    assert fetched.company_profile is None


@pytest.mark.asyncio
async def test_orphan_company_profile_user_is_none(session: AsyncSession):
    """CompanyProfile created without a User (admin pre-invite flow) has user=None.

    Pins the type annotation: CompanyProfile.user is Optional since user_id is
    nullable.
    """
    orphan = CompanyProfile(
        name="Pre-Invite Co",
        user_id=None,
        company_id="999999999",
        address="כתובת לדוגמה",
        contact_first_name="א",
        contact_last_name="ב",
        contact_mobile_phone="0500000000",
    )
    session.add(orphan)
    await session.commit()

    result = await session.execute(
        select(CompanyProfile)
        .options(selectinload(CompanyProfile.user))
        .where(CompanyProfile.name == "Pre-Invite Co")
    )
    fetched = result.scalar_one()
    assert fetched.user is None
