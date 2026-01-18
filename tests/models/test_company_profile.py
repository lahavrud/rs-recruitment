"""Tests for CompanyProfile model."""

import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.infrastructure.security import get_password_hash
from src.enums import UserRole
from src.models import CompanyProfile, User


@pytest.mark.asyncio
async def test_company_profile_creation_with_required_fields(session: AsyncSession):
    """Test CompanyProfile creation with required fields."""
    user = User(
        email="company@example.com",
        hashed_password=get_password_hash("password"),
        role=UserRole.COMPANY,
        is_active=True,
    )
    session.add(user)
    await session.flush()

    company = CompanyProfile(
        user_id=user.id,  # type: ignore[arg-type]
        name="Test Company",
    )
    session.add(company)
    await session.commit()
    await session.refresh(company)

    assert company.id is not None
    assert company.user_id == user.id
    assert company.name == "Test Company"
    assert company.logo_url is None  # Optional field
    assert company.contact_person is None  # Optional field
    assert company.contact_phone is None  # Optional field
    assert company.created_at is not None


@pytest.mark.asyncio
async def test_company_profile_creation_with_all_fields(session: AsyncSession):
    """Test CompanyProfile creation with all fields."""
    user = User(
        email="full_company@example.com",
        hashed_password=get_password_hash("password"),
        role=UserRole.COMPANY,
        is_active=True,
    )
    session.add(user)
    await session.flush()

    company = CompanyProfile(
        user_id=user.id,  # type: ignore[arg-type]
        name="Full Company",
        logo_url="https://example.com/logo.png",
        contact_person="John Doe",
        contact_phone="+1234567890",
    )
    session.add(company)
    await session.commit()
    await session.refresh(company)

    assert company.id is not None
    assert company.name == "Full Company"
    assert company.logo_url == "https://example.com/logo.png"
    assert company.contact_person == "John Doe"
    assert company.contact_phone == "+1234567890"
    assert company.created_at is not None


@pytest.mark.asyncio
async def test_company_profile_optional_fields(session: AsyncSession):
    """Test CompanyProfile optional fields handling."""
    user = User(
        email="optional@example.com",
        hashed_password=get_password_hash("password"),
        role=UserRole.COMPANY,
        is_active=True,
    )
    session.add(user)
    await session.flush()

    # Test with None values for optional fields
    company = CompanyProfile(
        user_id=user.id,  # type: ignore[arg-type]
        name="Optional Fields Company",
        logo_url=None,
        contact_person=None,
        contact_phone=None,
    )
    session.add(company)
    await session.commit()
    await session.refresh(company)

    assert company.logo_url is None
    assert company.contact_person is None
    assert company.contact_phone is None

    # Test with string values
    company.logo_url = "https://example.com/new-logo.png"
    company.contact_person = "Jane Doe"
    company.contact_phone = "+9876543210"
    await session.commit()
    await session.refresh(company)

    assert company.logo_url == "https://example.com/new-logo.png"
    assert company.contact_person == "Jane Doe"
    assert company.contact_phone == "+9876543210"


@pytest.mark.asyncio
async def test_company_profile_default_values(session: AsyncSession):
    """Test CompanyProfile default values."""
    user = User(
        email="defaults@example.com",
        hashed_password=get_password_hash("password"),
        role=UserRole.COMPANY,
        is_active=True,
    )
    session.add(user)
    await session.flush()

    company = CompanyProfile(
        user_id=user.id,  # type: ignore[arg-type]
        name="Defaults Company",
    )
    session.add(company)
    await session.commit()
    await session.refresh(company)

    assert company.created_at is not None


@pytest.mark.asyncio
async def test_company_profile_user_relationship(session: AsyncSession):
    """Test CompanyProfile-User 1:1 relationship."""
    user = User(
        email="relationship@example.com",
        hashed_password=get_password_hash("password"),
        role=UserRole.COMPANY,
        is_active=True,
    )
    session.add(user)
    await session.flush()

    company = CompanyProfile(
        user_id=user.id,  # type: ignore[arg-type]
        name="Relationship Company",
    )
    session.add(company)
    await session.commit()
    await session.refresh(company)
    await session.refresh(user)

    # Test relationship access - need to explicitly load relationships
    # SQLModel relationships may require explicit loading
    from sqlalchemy import select

    # Query to load the relationship
    result = await session.execute(
        select(CompanyProfile).where(CompanyProfile.id == company.id)  # type: ignore[arg-type]
    )
    loaded_company = result.scalar_one()
    assert loaded_company.user is not None
    assert loaded_company.user.id == user.id
    assert loaded_company.user.email == "relationship@example.com"

    result = await session.execute(select(User).where(User.id == user.id))  # type: ignore[arg-type]
    loaded_user = result.scalar_one()
    assert loaded_user.company_profile is not None
    assert loaded_user.company_profile.id == company.id


@pytest.mark.asyncio
async def test_company_profile_foreign_key_constraint(session: AsyncSession):
    """Test foreign key constraint to User."""
    # Try to create CompanyProfile with non-existent user_id
    company = CompanyProfile(
        user_id=9999,  # Non-existent user
        name="Invalid Company",
    )
    session.add(company)

    with pytest.raises(IntegrityError):
        await session.commit()


@pytest.mark.asyncio
async def test_company_profile_user_id_uniqueness(session: AsyncSession):
    """Test that user_id must be unique (1:1 relationship enforcement)."""
    user = User(
        email="unique@example.com",
        hashed_password=get_password_hash("password"),
        role=UserRole.COMPANY,
        is_active=True,
    )
    session.add(user)
    await session.flush()

    # Create first company profile
    company1 = CompanyProfile(
        user_id=user.id,  # type: ignore[arg-type]
        name="First Company",
    )
    session.add(company1)
    await session.commit()

    # Try to create second company profile with same user_id
    company2 = CompanyProfile(
        user_id=user.id,  # type: ignore[arg-type]
        name="Second Company",
    )
    session.add(company2)

    with pytest.raises(IntegrityError):
        await session.commit()


@pytest.mark.asyncio
async def test_company_profile_valid_user_id_creates_relationship(
    session: AsyncSession,
):
    """Test that valid user_id creates relationship."""
    user = User(
        email="valid@example.com",
        hashed_password=get_password_hash("password"),
        role=UserRole.COMPANY,
        is_active=True,
    )
    session.add(user)
    await session.flush()

    company = CompanyProfile(
        user_id=user.id,  # type: ignore[arg-type]
        name="Valid Company",
    )
    session.add(company)
    await session.commit()
    await session.refresh(company)

    assert company.user_id == user.id
    assert company.user.id == user.id


@pytest.mark.asyncio
async def test_company_profile_query_by_user_id(session: AsyncSession):
    """Test querying CompanyProfile by user_id (indexed field)."""
    user = User(
        email="query@example.com",
        hashed_password=get_password_hash("password"),
        role=UserRole.COMPANY,
        is_active=True,
    )
    session.add(user)
    await session.flush()

    company = CompanyProfile(
        user_id=user.id,  # type: ignore[arg-type]
        name="Query Company",
    )
    session.add(company)
    await session.commit()

    # Query by user_id
    result = await session.execute(
        select(CompanyProfile).where(CompanyProfile.user_id == user.id)  # type: ignore[arg-type]
    )
    found_company = result.scalar_one_or_none()

    assert found_company is not None
    assert found_company.id == company.id
    assert found_company.user_id == user.id
