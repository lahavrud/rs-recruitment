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

from src.core.database import get_session
from src.core.security import verify_password
from src.main import app
from src.models import User

# Use in-memory SQLite for tests
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

# Create test engine and session factory
test_engine = create_async_engine(TEST_DATABASE_URL, echo=False, future=True)
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

    response = await client.post("/auth/register", json=registration_data)
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
    response1 = await client.post("/auth/register", json=registration_data)
    assert response1.status_code == 201

    # Second registration with same email should fail
    response2 = await client.post("/auth/register", json=registration_data)
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
    await client.post("/auth/register", json=registration_data)

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
    await client.post("/auth/register", json=registration_data)

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
    await client.post("/auth/register", json=registration_data)

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

    response = await client.post("/auth/register", json=registration_data)
    assert response.status_code == 201

    data = response.json()
    assert data["user"]["email"] == "minimal@example.com"
    assert data["company_profile"]["name"] == "Minimal Company"
    assert data["company_profile"]["logo_url"] is None
    assert data["company_profile"]["contact_person"] is None
    assert data["company_profile"]["contact_phone"] is None
