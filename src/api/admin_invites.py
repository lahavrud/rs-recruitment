"""Admin endpoints for company invite-token management."""

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.infrastructure.database import get_session
from src.core.infrastructure.dependencies import get_current_admin
from src.core.infrastructure.error_handling import service_exception_to_http
from src.models import User
from src.schemas import InviteTokenCreate, InviteTokenRead
from src.services.admin_invites import (
    create_invite,
    list_invites,
    resend_invite,
    revoke_invite,
)
from src.services.exceptions import (
    EmailAlreadyExistsError,
    InviteAlreadyRevokedError,
    InviteNotFoundError,
    InvitePendingForEmailError,
)

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.post(
    "/companies/invite",
    response_model=InviteTokenRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_company_invite(
    data: InviteTokenCreate,
    current_admin: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_session),
) -> InviteTokenRead:
    """Generate a single-use invite token and send it via email."""
    assert current_admin.id is not None
    try:
        result = await create_invite(current_admin.id, data, session)
        await session.commit()
        return result
    except (InvitePendingForEmailError, EmailAlreadyExistsError) as e:
        await session.rollback()
        raise service_exception_to_http(e) from e
    except Exception:
        await session.rollback()
        raise


@router.get(
    "/companies/invites",
    response_model=list[InviteTokenRead],
)
async def get_company_invites(
    current_admin: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_session),
) -> list[InviteTokenRead]:
    """List all invite tokens with their current status."""
    result = await list_invites(session)
    await session.commit()
    return result


@router.delete(
    "/companies/invites/{token_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def revoke_company_invite(
    token_id: int,
    current_admin: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_session),
) -> None:
    """Revoke a pending invite token."""
    try:
        await revoke_invite(token_id, session)
        await session.commit()
    except (InviteNotFoundError, InviteAlreadyRevokedError) as e:
        await session.rollback()
        raise service_exception_to_http(e) from e
    except Exception:
        await session.rollback()
        raise


@router.post(
    "/companies/invites/{token_id}/resend",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def resend_company_invite(
    token_id: int,
    current_admin: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_session),
) -> None:
    """Regenerate and resend an invite email for an existing invite record."""
    try:
        await resend_invite(token_id, session)
        await session.commit()
    except (InviteNotFoundError, InviteAlreadyRevokedError) as e:
        await session.rollback()
        raise service_exception_to_http(e) from e
    except Exception:
        await session.rollback()
        raise
