"""Tests for authentication endpoints."""

from unittest.mock import AsyncMock, patch

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlmodel import SQLModel

from src.core.infrastructure.database import get_session
from src.core.infrastructure.security import verify_password
from src.main import app
from src.models import User
from src.services.exceptions import InvalidInviteTokenError
from tests.conftest import enable_sqlite_foreign_keys

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(TEST_DATABASE_URL, echo=False, future=True)
enable_sqlite_foreign_keys(test_engine)
TestSessionLocal = async_sessionmaker(
    test_engine, class_=AsyncSession, expire_on_commit=False
)

FAKE_LOGO_FILE = ("logo.png", b"fake-png-bytes", "image/png")


async def override_get_session():
    async with TestSessionLocal() as session:
        yield session


@pytest.fixture(scope="function")
async def test_db():
    async with test_engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.drop_all)


@pytest.fixture(scope="function")
async def client(test_db):
    from src.api import auth

    auth.limiter.enabled = False
    if hasattr(app.state, "limiter"):
        app.state.limiter.enabled = False

    app.dependency_overrides[get_session] = override_get_session
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as test_client:
        yield test_client
        app.dependency_overrides.clear()


def _reg_data(**overrides):
    """Base multipart form data for a valid registration."""
    data = {
        "email": "company@example.com",
        "password": "securepassword123",
        "company_name": "Test Company",
        "company_id": "123456789",
        "contact_first_name": "ישראל",
        "contact_last_name": "ישראלי",
        "contact_mobile_phone": "0501234567",
    }
    data.update(overrides)
    return data


@pytest.mark.asyncio
async def test_register_success(client: AsyncClient):
    """Test successful company registration."""
    response = await client.post(
        "/auth/register",
        params={"token": "valid-test-token"},
        data=_reg_data(),
        files={"logo": FAKE_LOGO_FILE},
    )
    assert response.status_code == 201

    data = response.json()
    assert data["user"]["email"] == "company@example.com"
    assert data["user"]["role"] == "COMPANY"
    assert data["user"]["is_active"] is False
    assert "password" not in str(data)

    cp = data["company_profile"]
    assert cp["name"] == "Test Company"
    assert cp["company_id"] == "123456789"
    assert cp["contact_first_name"] == "ישראל"
    assert cp["contact_last_name"] == "ישראלי"
    assert cp["contact_mobile_phone"] == "0501234567"
    assert cp["logo_url"] is not None

    async with TestSessionLocal() as session:
        result = await session.execute(
            select(User).where(User.email == "company@example.com")  # pyright: ignore[reportArgumentType]
        )
        user = result.scalar_one()
        assert verify_password("securepassword123", user.hashed_password)


@pytest.mark.asyncio
async def test_register_invalid_company_id(client: AsyncClient):
    """Test 422 when company_id is not 9 digits."""
    response = await client.post(
        "/auth/register",
        params={"token": "valid-test-token"},
        data=_reg_data(company_id="12345"),
        files={"logo": FAKE_LOGO_FILE},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_register_invalid_mobile_phone(client: AsyncClient):
    """Test 422 when mobile phone is not a valid Israeli mobile number."""
    response = await client.post(
        "/auth/register",
        params={"token": "valid-test-token"},
        data=_reg_data(contact_mobile_phone="0521234567890"),
        files={"logo": FAKE_LOGO_FILE},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_register_missing_contact_first_name(client: AsyncClient):
    """Test 422 when contact_first_name is missing."""
    d = _reg_data()
    del d["contact_first_name"]
    response = await client.post(
        "/auth/register",
        params={"token": "valid-test-token"},
        data=d,
        files={"logo": FAKE_LOGO_FILE},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_register_missing_logo(client: AsyncClient):
    """Test 422 when logo file is not provided."""
    response = await client.post(
        "/auth/register",
        params={"token": "valid-test-token"},
        data=_reg_data(),
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_register_duplicate_email(client: AsyncClient):
    """Test registration fails when email already exists."""
    await client.post(
        "/auth/register",
        params={"token": "valid-test-token"},
        data=_reg_data(email="duplicate@example.com"),
        files={"logo": FAKE_LOGO_FILE},
    )
    response = await client.post(
        "/auth/register",
        params={"token": "valid-test-token"},
        data=_reg_data(email="duplicate@example.com"),
        files={"logo": FAKE_LOGO_FILE},
    )
    assert response.status_code == 400
    assert "already" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient):
    """Test successful login returns JWT token."""
    await client.post(
        "/auth/register",
        params={"token": "valid-test-token"},
        data=_reg_data(email="login@example.com"),
        files={"logo": FAKE_LOGO_FILE},
    )
    async with TestSessionLocal() as session:
        result = await session.execute(
            select(User).where(User.email == "login@example.com")  # pyright: ignore[reportArgumentType]
        )
        user = result.scalar_one()
        user.is_active = True
        await session.commit()

    response = await client.post(
        "/auth/login",
        json={"email": "login@example.com", "password": "securepassword123"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_login_invalid_email(client: AsyncClient):
    """Test login fails with unknown email."""
    response = await client.post(
        "/auth/login", json={"email": "nonexistent@example.com", "password": "pass"}
    )
    assert response.status_code == 401
    assert "incorrect email or password" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_login_invalid_password(client: AsyncClient):
    """Test login fails with wrong password."""
    await client.post(
        "/auth/register",
        params={"token": "valid-test-token"},
        data=_reg_data(email="wrongpass@example.com"),
        files={"logo": FAKE_LOGO_FILE},
    )
    async with TestSessionLocal() as session:
        result = await session.execute(
            select(User).where(User.email == "wrongpass@example.com")  # pyright: ignore[reportArgumentType]
        )
        user = result.scalar_one()
        user.is_active = True
        await session.commit()

    response = await client.post(
        "/auth/login",
        json={"email": "wrongpass@example.com", "password": "wrongpassword"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_login_inactive_user(client: AsyncClient):
    """Test login fails for inactive users."""
    await client.post(
        "/auth/register",
        params={"token": "valid-test-token"},
        data=_reg_data(email="inactive@example.com"),
        files={"logo": FAKE_LOGO_FILE},
    )
    response = await client.post(
        "/auth/login",
        json={"email": "inactive@example.com", "password": "securepassword123"},
    )
    assert response.status_code == 403
    assert "inactive" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_register_missing_token_returns_422(client: AsyncClient):
    """Test registration without a token returns 422."""
    response = await client.post(
        "/auth/register",
        data=_reg_data(),
        files={"logo": FAKE_LOGO_FILE},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_register_invalid_token_returns_400(client: AsyncClient):
    """Test that an invalid/expired invite token returns 400."""
    with patch(
        "src.api.auth.validate_invite_token",
        new_callable=AsyncMock,
        side_effect=InvalidInviteTokenError(),
    ):
        response = await client.post(
            "/auth/register",
            params={"token": "expired-or-fake-token"},
            data=_reg_data(email="badtoken@example.com"),
            files={"logo": FAKE_LOGO_FILE},
        )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_register_token_consumed_on_success(client: AsyncClient):
    """Test that the invite token is consumed after successful registration."""
    with (
        patch(
            "src.api.auth.validate_invite_token", new_callable=AsyncMock
        ) as mock_validate,
        patch(
            "src.api.auth.consume_invite_token", new_callable=AsyncMock
        ) as mock_consume,
    ):
        response = await client.post(
            "/auth/register",
            params={"token": "one-time-token"},
            data=_reg_data(email="tokenconsumed@example.com"),
            files={"logo": FAKE_LOGO_FILE},
        )
    assert response.status_code == 201
    mock_validate.assert_awaited_once_with("one-time-token")
    mock_consume.assert_awaited_once_with("one-time-token")
