"""Tests for User model."""

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.infrastructure.security import get_password_hash, verify_password
from src.enums import UserRole
from src.models import User


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
