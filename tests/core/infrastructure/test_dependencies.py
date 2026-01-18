"""Tests for authentication dependencies."""

import pytest
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlmodel import SQLModel

from src.core.infrastructure.dependencies import get_current_admin, get_current_user
from src.core.infrastructure.security import create_access_token
from src.enums import UserRole
from src.models import User
from tests.conftest import enable_sqlite_foreign_keys

# Use in-memory SQLite for tests
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

# Create test engine and session factory
test_engine = create_async_engine(TEST_DATABASE_URL, echo=False, future=True)
# Enable FK constraints for SQLite to match PostgreSQL behavior
enable_sqlite_foreign_keys(test_engine)
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


@pytest.fixture
async def admin_user(session: AsyncSession):
    """Create an active admin test user."""
    from src.core.infrastructure.security import get_password_hash

    user = User(
        email="admin@example.com",
        hashed_password=get_password_hash("adminpassword"),
        role=UserRole.ADMIN,
        is_active=True,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


@pytest.fixture
async def company_user(session: AsyncSession):
    """Create an active company test user."""
    from src.core.infrastructure.security import get_password_hash

    user = User(
        email="company@example.com",
        hashed_password=get_password_hash("companypassword"),
        role=UserRole.COMPANY,
        is_active=True,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


class TestGetCurrentAdmin:
    """Tests for get_current_admin() dependency."""

    @pytest.mark.asyncio
    async def test_get_current_admin_admin_user_access(
        self, session: AsyncSession, admin_user: User
    ):
        """Test that admin user with valid token passes."""
        token = create_access_token(
            data={
                "sub": str(admin_user.id),
                "email": admin_user.email,
                "role": admin_user.role.value,
            }
        )

        credentials = MockCredentials(token)

        # First get current user (which get_current_admin depends on)
        current_user = await get_current_user(credentials=credentials, session=session)

        # Then test get_current_admin
        admin = await get_current_admin(current_user=current_user)

        assert admin.id == admin_user.id
        assert admin.email == admin_user.email
        assert admin.role == UserRole.ADMIN

    @pytest.mark.asyncio
    async def test_get_current_admin_non_admin_user_rejection(
        self, session: AsyncSession, company_user: User
    ):
        """Test that COMPANY role user raises 403 error."""
        token = create_access_token(
            data={
                "sub": str(company_user.id),
                "email": company_user.email,
                "role": company_user.role.value,
            }
        )

        credentials = MockCredentials(token)

        # Get current user first
        current_user = await get_current_user(credentials=credentials, session=session)

        # Try to get admin - should fail
        with pytest.raises(HTTPException) as exc_info:
            await get_current_admin(current_user=current_user)

        assert exc_info.value.status_code == 403
        assert "admin" in exc_info.value.detail.lower()

    @pytest.mark.asyncio
    async def test_get_current_admin_invalid_token(
        self, session: AsyncSession, admin_user: User
    ):
        """Test that invalid token raises appropriate error."""
        invalid_token = "invalid.token.here"

        credentials = MockCredentials(invalid_token)

        # Should fail at get_current_user level
        with pytest.raises(HTTPException) as exc_info:
            await get_current_user(credentials=credentials, session=session)

        assert exc_info.value.status_code == 401

    @pytest.mark.asyncio
    async def test_get_current_admin_inactive_admin_user(self, session: AsyncSession):
        """Test inactive admin user handling."""
        from src.core.infrastructure.security import get_password_hash

        inactive_admin = User(
            email="inactive_admin@example.com",
            hashed_password=get_password_hash("adminpassword"),
            role=UserRole.ADMIN,
            is_active=False,
        )
        session.add(inactive_admin)
        await session.commit()
        await session.refresh(inactive_admin)

        token = create_access_token(
            data={
                "sub": str(inactive_admin.id),
                "email": inactive_admin.email,
                "role": inactive_admin.role.value,
            }
        )

        credentials = MockCredentials(token)

        # Should fail at get_current_user level (inactive user)
        with pytest.raises(HTTPException) as exc_info:
            await get_current_user(credentials=credentials, session=session)

        assert exc_info.value.status_code == 403
        assert "inactive" in exc_info.value.detail.lower()
