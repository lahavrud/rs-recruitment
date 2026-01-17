"""Unit tests for authentication service layer."""

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlmodel import SQLModel

from src.core.infrastructure.security import verify_password
from src.models import CompanyProfile, User, UserRole
from src.schemas import CompanyProfileCreate, UserCreate
from src.services.auth import authenticate_user, register_company_user
from src.services.exceptions import (
    EmailAlreadyExistsError,
    InactiveUserError,
    InvalidCredentialsError,
)
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


@pytest.fixture
async def session(test_db) -> AsyncSession:
    """Create a test database session."""
    async with TestSessionLocal() as session:
        yield session


@pytest.mark.asyncio
async def test_register_company_user_success(session: AsyncSession):
    """Test successful company user registration."""
    user_data = UserCreate(
        email="company@example.com",
        password="securepassword123",
        company_profile=CompanyProfileCreate(
            name="Test Company",
            logo_url="https://example.com/logo.png",
            contact_person="John Doe",
            contact_phone="+1234567890",
        ),
    )

    result = await register_company_user(user_data, session)
    await session.commit()

    # Verify result structure
    assert result.user.email == "company@example.com"
    assert result.user.role == UserRole.COMPANY
    assert result.user.is_active is False
    assert result.company_profile.name == "Test Company"
    assert result.company_profile.logo_url == "https://example.com/logo.png"
    assert result.company_profile.contact_person == "John Doe"
    assert result.company_profile.contact_phone == "+1234567890"

    # Verify user was created in database
    db_result = await session.execute(
        select(User).where(User.email == "company@example.com")  # pyright: ignore[reportArgumentType]
    )
    db_user = db_result.scalar_one()
    assert db_user.email == "company@example.com"
    assert db_user.role == UserRole.COMPANY
    assert db_user.is_active is False
    assert verify_password("securepassword123", db_user.hashed_password)

    # Verify company profile was created
    db_profile_result = await session.execute(
        select(CompanyProfile).where(CompanyProfile.user_id == db_user.id)  # pyright: ignore[reportArgumentType]
    )
    db_profile = db_profile_result.scalar_one()
    assert db_profile.name == "Test Company"


@pytest.mark.asyncio
async def test_register_company_user_duplicate_email(session: AsyncSession):
    """Test registration fails when email already exists."""
    user_data = UserCreate(
        email="duplicate@example.com",
        password="password123",
        company_profile=CompanyProfileCreate(name="First Company"),
    )

    # First registration should succeed
    await register_company_user(user_data, session)
    await session.commit()

    # Second registration with same email should fail
    with pytest.raises(EmailAlreadyExistsError) as exc_info:
        await register_company_user(user_data, session)
    assert "duplicate@example.com" in str(exc_info.value)
    assert exc_info.value.email == "duplicate@example.com"


@pytest.mark.asyncio
async def test_register_company_user_minimal_data(session: AsyncSession):
    """Test registration works with minimal required data."""
    user_data = UserCreate(
        email="minimal@example.com",
        password="password123",
        company_profile=CompanyProfileCreate(name="Minimal Company"),
    )

    result = await register_company_user(user_data, session)
    await session.commit()

    assert result.user.email == "minimal@example.com"
    assert result.company_profile.name == "Minimal Company"
    assert result.company_profile.logo_url is None
    assert result.company_profile.contact_person is None
    assert result.company_profile.contact_phone is None


@pytest.mark.asyncio
async def test_authenticate_user_success(session: AsyncSession):
    """Test successful user authentication."""
    # Create a user first
    user_data = UserCreate(
        email="login@example.com",
        password="mypassword123",
        company_profile=CompanyProfileCreate(name="Login Test Company"),
    )
    await register_company_user(user_data, session)
    await session.commit()

    # Activate the user
    result = await session.execute(
        select(User).where(User.email == "login@example.com")  # pyright: ignore[reportArgumentType]
    )
    user = result.scalar_one()
    user.is_active = True
    await session.commit()

    # Authenticate
    authenticated_user = await authenticate_user(
        "login@example.com", "mypassword123", session
    )
    assert authenticated_user.email == "login@example.com"
    assert authenticated_user.is_active is True


@pytest.mark.asyncio
async def test_authenticate_user_invalid_email(session: AsyncSession):
    """Test authentication fails with invalid email."""
    with pytest.raises(InvalidCredentialsError) as exc_info:
        await authenticate_user("nonexistent@example.com", "somepassword", session)
    assert "Incorrect email or password" in str(exc_info.value)


@pytest.mark.asyncio
async def test_authenticate_user_invalid_password(session: AsyncSession):
    """Test authentication fails with invalid password."""
    # Create a user first
    user_data = UserCreate(
        email="wrongpass@example.com",
        password="correctpassword",
        company_profile=CompanyProfileCreate(name="Password Test Company"),
    )
    await register_company_user(user_data, session)
    await session.commit()

    # Activate the user
    result = await session.execute(
        select(User).where(User.email == "wrongpass@example.com")  # pyright: ignore[reportArgumentType]
    )
    user = result.scalar_one()
    user.is_active = True
    await session.commit()

    # Try to authenticate with wrong password
    with pytest.raises(InvalidCredentialsError) as exc_info:
        await authenticate_user("wrongpass@example.com", "wrongpassword", session)
    assert "Incorrect email or password" in str(exc_info.value)


@pytest.mark.asyncio
async def test_authenticate_user_inactive(session: AsyncSession):
    """Test authentication fails for inactive users."""
    # Create a user (defaults to inactive)
    user_data = UserCreate(
        email="inactive@example.com",
        password="password123",
        company_profile=CompanyProfileCreate(name="Inactive Company"),
    )
    await register_company_user(user_data, session)
    await session.commit()

    # Try to authenticate inactive user
    with pytest.raises(InactiveUserError) as exc_info:
        await authenticate_user("inactive@example.com", "password123", session)
    assert "inactive" in str(exc_info.value).lower()
    assert "admin approval" in str(exc_info.value).lower()
