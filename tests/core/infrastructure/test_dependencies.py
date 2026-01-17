"""Tests for authentication dependencies."""

import pytest
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlmodel import SQLModel

from src.core.infrastructure.dependencies import get_current_user
from src.core.infrastructure.security import create_access_token
from src.enums import UserRole
from src.models import User

# Use in-memory SQLite for tests
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

# Create test engine and session factory
test_engine = create_async_engine(TEST_DATABASE_URL, echo=False, future=True)
TestSessionLocal = async_sessionmaker(
    test_engine, class_=AsyncSession, expire_on_commit=False
)


@pytest.fixture(scope="function")
async def test_db():
    """Create and drop test database tables for each test."""
    async with test_engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.drop_all)


@pytest.fixture(scope="function")
async def session(test_db):
    """Create test database session."""
    async with TestSessionLocal() as session:
        yield session


@pytest.fixture
async def active_user(session: AsyncSession):
    """Create an active test user."""
    from src.core.infrastructure.security import get_password_hash

    user = User(
        email="test@example.com",
        hashed_password=get_password_hash("testpassword"),
        role=UserRole.COMPANY,
        is_active=True,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


class MockCredentials:
    """Mock HTTPAuthorizationCredentials for testing."""

    def __init__(self, token: str):
        self.credentials = token


@pytest.mark.asyncio
async def test_get_current_user_invalid_user_id_type(
    session: AsyncSession, active_user: User
):
    """Test that invalid user_id type in JWT token returns 401, not 500."""
    # Create token with non-integer user_id (string that can't be converted)
    invalid_token = create_access_token(
        data={"sub": "not_a_number", "email": "test@example.com", "role": "COMPANY"}
    )

    credentials = MockCredentials(invalid_token)

    with pytest.raises(HTTPException) as exc_info:
        await get_current_user(credentials=credentials, session=session)

    assert exc_info.value.status_code == 401
    assert "invalid" in exc_info.value.detail.lower()


@pytest.mark.asyncio
async def test_get_current_user_float_user_id(session: AsyncSession, active_user: User):
    """Test that float user_id in JWT token is handled gracefully."""
    # Create token with float user_id
    invalid_token = create_access_token(
        data={"sub": "123.456", "email": "test@example.com", "role": "COMPANY"}
    )

    credentials = MockCredentials(invalid_token)

    # Float strings can be converted to int via float, so this might work or fail
    # depending on implementation. We just want to ensure no 500 error.
    try:
        await get_current_user(credentials=credentials, session=session)
    except HTTPException as e:
        # Should be 401 (invalid token) or 401 (user not found), not 500
        assert e.status_code in [401, 403]


@pytest.mark.asyncio
async def test_get_current_user_none_user_id(session: AsyncSession):
    """Test that None user_id in JWT token returns 401."""
    # Create token with None user_id (missing sub)
    invalid_token = create_access_token(
        data={"email": "test@example.com", "role": "COMPANY"}
    )

    credentials = MockCredentials(invalid_token)

    with pytest.raises(HTTPException) as exc_info:
        await get_current_user(credentials=credentials, session=session)

    assert exc_info.value.status_code == 401
    assert "invalid" in exc_info.value.detail.lower()


@pytest.mark.asyncio
async def test_get_current_user_valid_token(session: AsyncSession, active_user: User):
    """Test that valid JWT token with correct user_id type works."""
    # Create valid token with integer user_id
    valid_token = create_access_token(
        data={
            "sub": str(active_user.id),
            "email": active_user.email,
            "role": active_user.role.value,
        }
    )

    credentials = MockCredentials(valid_token)

    user = await get_current_user(credentials=credentials, session=session)
    assert user.id == active_user.id
    assert user.email == active_user.email
    assert user.is_active is True


@pytest.mark.asyncio
async def test_get_current_user_inactive_user(session: AsyncSession):
    """Test that inactive user cannot authenticate."""
    from src.core.infrastructure.security import get_password_hash

    # Create inactive user
    inactive_user = User(
        email="inactive@example.com",
        hashed_password=get_password_hash("testpassword"),
        role=UserRole.COMPANY,
        is_active=False,
    )
    session.add(inactive_user)
    await session.commit()
    await session.refresh(inactive_user)

    # Create valid token for inactive user
    token = create_access_token(
        data={
            "sub": str(inactive_user.id),
            "email": inactive_user.email,
            "role": inactive_user.role.value,
        }
    )

    credentials = MockCredentials(token)

    with pytest.raises(HTTPException) as exc_info:
        await get_current_user(credentials=credentials, session=session)

    assert exc_info.value.status_code == 403
    assert "inactive" in exc_info.value.detail.lower()
