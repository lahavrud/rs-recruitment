"""Tests for authentication endpoints."""

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlmodel import SQLModel
from unittest.mock import AsyncMock, patch

from src.core.infrastructure.database import get_session
from src.core.infrastructure.security import verify_password
from src.main import app
from src.models import User
from src.services.exceptions import InvalidInviteTokenError
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


async def override_get_session():
    """Override get_session dependency for tests."""
    async with TestSessionLocal() as session:
        yield session


@pytest.fixture(scope="function")
async def test_db():
    """Create and drop test database tables for each test."""
    async with test_engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.drop_all)


@pytest.fixture(scope="function")
async def client(test_db):
    """Create test client with overridden database dependency."""
    # Rate limiting is automatically disabled via settings.testing=True
    # (set in conftest.py setup_testing_environment fixture)
    # Disable rate limiting on the existing limiter instance
    # (decorators capture the limiter, so we update the same instance)
    from src.api import auth

    auth.limiter.enabled = False
    # Only disable app.state.limiter if it exists
    # (may not be initialized in all PRs)
    if hasattr(app.state, "limiter"):
        app.state.limiter.enabled = False

    # Override database dependency
    app.dependency_overrides[get_session] = override_get_session
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as test_client:
        yield test_client
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_register_success(client: AsyncClient):
    """Test successful company registration."""
    registration_data = {
        "email": "company@example.com",
        "password": "securepassword123",
        "company_profile": {
            "name": "Test Company",
            "logo_url": "https://example.com/logo.png",
            "contact_person": "John Doe",
            "contact_phone": "+1234567890",
        },
    }

    response = await client.post("/auth/register", json=registration_data, params={"token": "valid-test-token"})
    assert response.status_code == 201

    data = response.json()
    assert "user" in data
    assert "company_profile" in data

    user_data = data["user"]
    assert user_data["email"] == "company@example.com"
    assert user_data["role"] == "COMPANY"
    assert user_data["is_active"] is False  # Requires Admin approval
    assert "password" not in str(data)  # Password should never be in response

    company_data = data["company_profile"]
    assert company_data["name"] == "Test Company"
    assert company_data["logo_url"] == "https://example.com/logo.png"
    assert company_data["contact_person"] == "John Doe"
    assert company_data["contact_phone"] == "+1234567890"

    # Verify password is hashed in database
    async with TestSessionLocal() as session:
        result = await session.execute(
            select(User).where(User.email == "company@example.com")  # pyright: ignore[reportArgumentType]
        )
        user = result.scalar_one()
        assert user.hashed_password != "securepassword123"
        assert verify_password("securepassword123", user.hashed_password)


@pytest.mark.asyncio
async def test_register_duplicate_email(client: AsyncClient):
    """Test registration fails when email already exists."""
    registration_data = {
        "email": "duplicate@example.com",
        "password": "password123",
        "company_profile": {"name": "First Company"},
    }

    # First registration should succeed
    response1 = await client.post("/auth/register", json=registration_data, params={"token": "valid-test-token"})
    assert response1.status_code == 201

    # Second registration with same email should fail
    response2 = await client.post("/auth/register", json=registration_data, params={"token": "valid-test-token"})
    assert response2.status_code == 400
    assert "already registered" in response2.json()["detail"].lower()


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient):
    """Test successful login returns JWT token."""
    # First register a user
    registration_data = {
        "email": "login@example.com",
        "password": "mypassword123",
        "company_profile": {"name": "Login Test Company"},
    }
    await client.post("/auth/register", json=registration_data, params={"token": "valid-test-token"})

    # Activate the user (simulating admin approval)
    async with TestSessionLocal() as session:
        result = await session.execute(
            select(User).where(User.email == "login@example.com")  # pyright: ignore[reportArgumentType]
        )
        user = result.scalar_one()
        user.is_active = True
        await session.commit()

    # Then login
    login_data = {
        "email": "login@example.com",
        "password": "mypassword123",
    }
    response = await client.post("/auth/login", json=login_data)
    assert response.status_code == 200

    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert len(data["access_token"]) > 0


@pytest.mark.asyncio
async def test_login_invalid_email(client: AsyncClient):
    """Test login fails with invalid email."""
    login_data = {
        "email": "nonexistent@example.com",
        "password": "somepassword",
    }
    response = await client.post("/auth/login", json=login_data)
    assert response.status_code == 401
    assert "incorrect email or password" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_login_invalid_password(client: AsyncClient):
    """Test login fails with invalid password."""
    # First register a user
    registration_data = {
        "email": "wrongpass@example.com",
        "password": "correctpassword",
        "company_profile": {"name": "Password Test Company"},
    }
    await client.post("/auth/register", json=registration_data, params={"token": "valid-test-token"})

    # Activate the user (simulating admin approval)
    async with TestSessionLocal() as session:
        result = await session.execute(
            select(User).where(User.email == "wrongpass@example.com")  # pyright: ignore[reportArgumentType]
        )
        user = result.scalar_one()
        user.is_active = True
        await session.commit()

    # Then try to login with wrong password
    login_data = {
        "email": "wrongpass@example.com",
        "password": "wrongpassword",
    }
    response = await client.post("/auth/login", json=login_data)
    assert response.status_code == 401
    assert "incorrect email or password" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_login_inactive_user(client: AsyncClient):
    """Test login fails for inactive users."""
    # Register a user (defaults to inactive)
    registration_data = {
        "email": "inactive@example.com",
        "password": "password123",
        "company_profile": {"name": "Inactive Company"},
    }
    await client.post("/auth/register", json=registration_data, params={"token": "valid-test-token"})

    # Try to login with inactive user
    login_data = {
        "email": "inactive@example.com",
        "password": "password123",
    }
    response = await client.post("/auth/login", json=login_data)
    assert response.status_code == 403
    assert "inactive" in response.json()["detail"].lower()
    assert "admin approval" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_register_minimal_data(client: AsyncClient):
    """Test registration works with minimal required data."""
    registration_data = {
        "email": "minimal@example.com",
        "password": "password123",
        "company_profile": {"name": "Minimal Company"},
    }

    response = await client.post("/auth/register", json=registration_data, params={"token": "valid-test-token"})
    assert response.status_code == 201

    data = response.json()
    assert data["user"]["email"] == "minimal@example.com"
    assert data["company_profile"]["name"] == "Minimal Company"
    assert data["company_profile"]["logo_url"] is None
    assert data["company_profile"]["contact_person"] is None
    assert data["company_profile"]["contact_phone"] is None


@pytest.mark.asyncio
async def test_register_duplicate_returns_400_not_500(client: AsyncClient):
    """Test that duplicate registration returns 400, not 500.

    This ensures IntegrityError is properly caught and converted to a
    user-friendly error message rather than leaking as a 500 Internal Server Error.
    """
    registration_data = {
        "email": "duplicate-test@example.com",
        "password": "password123",
        "company_profile": {"name": "Duplicate Test Company"},
    }

    # First registration should succeed
    response1 = await client.post("/auth/register", json=registration_data, params={"token": "valid-test-token"})
    assert response1.status_code == 201

    # Second registration with same email should return 400 (not 500)
    response2 = await client.post("/auth/register", json=registration_data, params={"token": "valid-test-token"})
    assert response2.status_code == 400
    detail = response2.json()["detail"].lower()
    assert "already" in detail or "exists" in detail

    # Verify only one user was created in database
    async with TestSessionLocal() as session:
        result = await session.execute(
            select(User).where(User.email == "duplicate-test@example.com")  # pyright: ignore[reportArgumentType]
        )
        users = result.scalars().all()
        assert len(users) == 1


@pytest.mark.asyncio
async def test_register_missing_token_returns_422(client: AsyncClient):
    """Test that registration without a token returns 422 (missing required query param)."""
    registration_data = {
        "email": "notoken@example.com",
        "password": "password123",
        "company_profile": {"name": "No Token Co"},
    }
    response = await client.post("/auth/register", json=registration_data)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_register_invalid_token_returns_400(client: AsyncClient):
    """Test that an invalid/expired invite token returns 400."""
    registration_data = {
        "email": "badtoken@example.com",
        "password": "password123",
        "company_profile": {"name": "Bad Token Co"},
    }
    with patch(
        "src.api.auth.validate_invite_token",
        new_callable=AsyncMock,
        side_effect=InvalidInviteTokenError(),
    ):
        response = await client.post(
            "/auth/register",
            json=registration_data,
            params={"token": "expired-or-fake-token"},
        )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_register_token_consumed_on_success(client: AsyncClient):
    """Test that the invite token is consumed after successful registration."""
    registration_data = {
        "email": "tokenconsumed@example.com",
        "password": "password123",
        "company_profile": {"name": "Consumed Token Co"},
    }
    with (
        patch("src.api.auth.validate_invite_token", new_callable=AsyncMock) as mock_validate,
        patch("src.api.auth.consume_invite_token", new_callable=AsyncMock) as mock_consume,
    ):
        response = await client.post(
            "/auth/register",
            json=registration_data,
            params={"token": "one-time-token"},
        )
    assert response.status_code == 201
    mock_validate.assert_awaited_once_with("one-time-token")
    mock_consume.assert_awaited_once_with("one-time-token")
