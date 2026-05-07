"""Service-level tests for activation token consumption."""

from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.infrastructure.security import get_password_hash
from src.enums import UserRole
from src.models import ActivationToken, User
from src.services.activation import activate_company
from src.services.exceptions import InvalidActivationTokenError


async def _make_pending_user(
    session: AsyncSession, email: str = "company@test.com"
) -> User:
    user = User(
        email=email,
        hashed_password=get_password_hash("SecurePass1!"),
        role=UserRole.COMPANY,
        is_active=False,
    )
    session.add(user)
    await session.flush()
    return user


def _make_token(user_id: int, *, used: bool = False, expired: bool = False) -> str:
    return f"token-{user_id}-{used}-{expired}"


@pytest.mark.asyncio
async def test_activate_company_marks_user_active_and_token_used(
    session: AsyncSession,
):
    user = await _make_pending_user(session)
    token = _make_token(user.id)
    session.add(
        ActivationToken(
            token=token,
            company_user_id=user.id,
            expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
        )
    )
    await session.commit()

    activated = await activate_company(token, session)
    await session.commit()

    assert activated.id == user.id
    assert activated.is_active is True


@pytest.mark.asyncio
async def test_activate_company_rejects_unknown_token(session: AsyncSession):
    with pytest.raises(InvalidActivationTokenError):
        await activate_company("does-not-exist", session)


@pytest.mark.asyncio
async def test_activate_company_rejects_used_token(session: AsyncSession):
    user = await _make_pending_user(session, email="used@test.com")
    token = _make_token(user.id, used=True)
    session.add(
        ActivationToken(
            token=token,
            company_user_id=user.id,
            expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
            used=True,
        )
    )
    await session.commit()

    with pytest.raises(InvalidActivationTokenError):
        await activate_company(token, session)


@pytest.mark.asyncio
async def test_activate_company_rejects_expired_token(session: AsyncSession):
    user = await _make_pending_user(session, email="expired@test.com")
    token = _make_token(user.id, expired=True)
    session.add(
        ActivationToken(
            token=token,
            company_user_id=user.id,
            expires_at=datetime.now(timezone.utc) - timedelta(hours=1),
        )
    )
    await session.commit()

    with pytest.raises(InvalidActivationTokenError):
        await activate_company(token, session)
