"""Account-activation token consumption.

Lives next to the admin company lifecycle code that mints these tokens
(`admin_companies.approve_company`), but kept in its own module so
`/activate` can use it without pulling in the full admin surface.
"""

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models import ActivationToken, User
from src.services.exceptions import InvalidActivationTokenError


async def activate_company(token: str, session: AsyncSession) -> User:
    """Activate a company account using the one-time activation token.

    Raises:
        InvalidActivationTokenError: If the token is invalid, expired, or already used.
    """
    now = datetime.now(timezone.utc)
    result = await session.execute(
        select(ActivationToken).where(
            ActivationToken.token == token  # type: ignore[arg-type]
        )
    )
    activation = result.scalar_one_or_none()

    if activation is None or activation.used:
        raise InvalidActivationTokenError("הקישור אינו תקף או שכבר נעשה בו שימוש")
    if activation.expires_at.replace(tzinfo=timezone.utc) < now:
        raise InvalidActivationTokenError("פג תוקף הקישור")

    user_result = await session.execute(
        select(User).where(User.id == activation.company_user_id)  # pyright: ignore[reportArgumentType]
    )
    user = user_result.scalar_one_or_none()
    if user is None:
        raise InvalidActivationTokenError("המשתמש לא נמצא")

    user.is_active = True
    activation.used = True
    return user
