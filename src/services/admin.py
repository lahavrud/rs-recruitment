"""Admin service layer for company approval workflow."""

from datetime import datetime, timezone

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.infrastructure.config import settings
from src.core.infrastructure.invite_tokens import (
    generate_invite_token,
    revoke_invite_token,
)
from src.core.tasks import enqueue_email_task
from src.enums import InviteTokenStatus, UserRole
from src.models import CompanyProfile, InviteToken, User
from src.schemas import CompanyProfileRead, InviteTokenCreate, InviteTokenRead, UserRead
from src.services.exceptions import (
    CompanyNotFoundError,
    CompanyNotPendingError,
    EmailAlreadyExistsError,
    InviteAlreadyRevokedError,
    InviteNotFoundError,
    InvitePendingForEmailError,
)


def _build_invite_email(
    contact_name: str | None,
    company_name: str | None,
    note: str | None,
    registration_url: str,
) -> str:
    lines: list[str] = []
    greeting = f"שלום {contact_name}," if contact_name else "שלום,"
    lines.append(greeting)
    lines.append("")
    if company_name:
        lines.append(
            f"הוזמנת להירשם לפלטפורמת RS Recruiting עבור החברה: {company_name}"
        )
    else:
        lines.append("הוזמנת להירשם לפלטפורמת RS Recruiting.")
    lines.append("")
    lines.append("לחצו על הקישור הבא להשלמת תהליך ההרשמה:")
    lines.append("")
    lines.append(registration_url)
    lines.append("")
    if note:
        lines.append(f"הודעה אישית: {note}")
        lines.append("")
    lines.append("שימו לב: הקישור תקף ל-48 שעות בלבד.")
    lines.append("")
    lines.append("בברכה,")
    lines.append("צוות RS Recruiting")
    return "\n".join(lines)


async def create_invite(
    admin_user_id: int,
    data: InviteTokenCreate,
    session: AsyncSession,
) -> InviteTokenRead:
    """Generate a token, store metadata in DB, send invite email."""
    existing_user = await session.execute(select(User).where(User.email == data.email))
    if existing_user.scalar_one_or_none() is not None:
        raise EmailAlreadyExistsError(data.email)

    pending_invite = await session.execute(
        select(InviteToken).where(
            InviteToken.email == data.email,
            InviteToken.status == InviteTokenStatus.PENDING,  # type: ignore[arg-type]
        )
    )
    if pending_invite.scalar_one_or_none() is not None:
        raise InvitePendingForEmailError(data.email)

    token, expires_at = await generate_invite_token()

    record = InviteToken(
        token=token,
        email=data.email,
        company_name=data.company_name,
        contact_first_name=data.contact_first_name,
        contact_last_name=data.contact_last_name,
        note=data.note,
        status=InviteTokenStatus.PENDING,
        created_by_admin_id=admin_user_id,
        expires_at=expires_at,
    )
    session.add(record)
    await session.flush()

    registration_url = f"{settings.frontend_base_url}/register?token={token}"
    contact_name = (
        " ".join(filter(None, [data.contact_first_name, data.contact_last_name]))
        or None
    )
    email_body = _build_invite_email(
        contact_name, data.company_name, data.note, registration_url
    )

    await enqueue_email_task(
        to=data.email,
        subject="הזמנה להרשמה ל-RS Recruiting",
        body=email_body,
    )

    return InviteTokenRead.model_validate(record)


async def list_invites(session: AsyncSession) -> list[InviteTokenRead]:
    """Return all invite records, marking expired ones in bulk first."""
    now = datetime.now(timezone.utc)
    await session.execute(
        update(InviteToken)
        .where(
            InviteToken.status == InviteTokenStatus.PENDING,  # type: ignore[arg-type]
            InviteToken.expires_at < now,  # type: ignore[operator]
        )
        .values(status=InviteTokenStatus.EXPIRED)
    )

    result = await session.execute(
        select(InviteToken).order_by(InviteToken.created_at.desc())  # type: ignore[arg-type]
    )
    records = result.scalars().all()
    return [InviteTokenRead.model_validate(r) for r in records]


async def revoke_invite(token_id: int, session: AsyncSession) -> None:
    """Revoke a pending invite: delete from Redis and mark as revoked in DB."""
    result = await session.execute(
        select(InviteToken).where(InviteToken.id == token_id)  # type: ignore[arg-type]
    )
    record = result.scalar_one_or_none()
    if record is None:
        raise InviteNotFoundError(f"Invite token with ID {token_id} not found")
    if record.status != InviteTokenStatus.PENDING:
        raise InviteAlreadyRevokedError(
            f"Invite {token_id} cannot be revoked (status: {record.status})"
        )

    await revoke_invite_token(record.token)
    record.status = InviteTokenStatus.REVOKED
    await session.flush()


async def resend_invite(token_id: int, session: AsyncSession) -> None:
    """Generate a fresh token for an existing invite and resend the email."""
    result = await session.execute(
        select(InviteToken).where(InviteToken.id == token_id)  # type: ignore[arg-type]
    )
    record = result.scalar_one_or_none()
    if record is None:
        raise InviteNotFoundError(f"Invite token with ID {token_id} not found")
    if record.status == InviteTokenStatus.USED:
        raise InviteAlreadyRevokedError(
            f"Invite {token_id} has already been used and cannot be resent"
        )

    await revoke_invite_token(record.token)
    new_token, new_expires_at = await generate_invite_token()
    record.token = new_token
    record.expires_at = new_expires_at
    record.status = InviteTokenStatus.PENDING
    await session.flush()

    registration_url = f"{settings.frontend_base_url}/register?token={new_token}"
    contact_name = (
        " ".join(filter(None, [record.contact_first_name, record.contact_last_name]))
        or None
    )
    email_body = _build_invite_email(
        contact_name, record.company_name, record.note, registration_url
    )

    await enqueue_email_task(
        to=record.email,
        subject="הזמנה להרשמה ל-RS Recruiting",
        body=email_body,
    )


async def get_all_admin_emails(session: AsyncSession) -> list[str]:
    """Get email addresses of all active admin users.

    Args:
        session: Database session

    Returns:
        List of admin email addresses
    """
    result = await session.execute(
        select(User.email).where(  # pyright: ignore[reportArgumentType]
            User.role == UserRole.ADMIN,
            User.is_active == True,  # noqa: E712
        )
    )
    admin_emails = result.scalars().all()
    return list(admin_emails)


async def list_pending_companies(session: AsyncSession) -> list[dict]:
    """List all pending company registrations (inactive COMPANY users).

    Returns companies with their associated user and profile information.

    Args:
        session: Database session

    Returns:
        List of dictionaries containing user and company profile data
    """
    result = await session.execute(
        select(User, CompanyProfile)
        .join(CompanyProfile, User.id == CompanyProfile.user_id)  # pyright: ignore[reportArgumentType]
        .where(User.role == UserRole.COMPANY, User.is_active == False)  # noqa: E712
        .order_by(User.created_at)
    )
    rows = result.all()

    companies = []
    for user, company_profile in rows:
        companies.append(
            {
                "user": UserRead.model_validate(user),
                "company_profile": CompanyProfileRead.model_validate(company_profile),
            }
        )

    return companies


async def approve_company(company_user_id: int, session: AsyncSession) -> dict:
    """Approve a company registration by activating the user.

    Sets User.is_active=True and sends email notification to the company.

    Args:
        company_user_id: ID of the company user to approve
        session: Database session

    Returns:
        Dictionary containing the approved user and company profile

    Raises:
        CompanyNotFoundError: If company user not found
        CompanyNotPendingError: If company is already approved or not a COMPANY user
    """
    # Find the user
    result = await session.execute(
        select(User).where(User.id == company_user_id)  # pyright: ignore[reportArgumentType]
    )
    user = result.scalar_one_or_none()
    if not user:
        raise CompanyNotFoundError(f"Company user with ID {company_user_id} not found")

    # Validate it's a COMPANY user
    if user.role != UserRole.COMPANY:
        raise CompanyNotPendingError(
            f"User {company_user_id} is not a COMPANY user (role: {user.role})"
        )

    # Validate it's pending (inactive)
    if user.is_active:
        raise CompanyNotPendingError(
            f"Company user {company_user_id} is already approved (active)"
        )

    # Activate the user
    user.is_active = True
    await session.flush()

    # Get company profile
    result = await session.execute(
        select(CompanyProfile).where(  # pyright: ignore[reportArgumentType]
            CompanyProfile.user_id == company_user_id
        )
    )
    company_profile = result.scalar_one()

    # Send approval email to company
    company_name = company_profile.name
    await enqueue_email_task(
        to=user.email,
        subject="Company Registration Approved",
        body=(
            f"Your company registration for '{company_name}' has been approved. "
            "You can now log in and start posting jobs."
        ),
    )

    return {
        "user": UserRead.model_validate(user),
        "company_profile": CompanyProfileRead.model_validate(company_profile),
    }


async def reject_company(company_user_id: int, session: AsyncSession) -> None:
    """Reject a company registration by deleting the user and company profile.

    Sends email notification to the company before deletion.

    Args:
        company_user_id: ID of the company user to reject
        session: Database session

    Raises:
        CompanyNotFoundError: If company user not found
        CompanyNotPendingError: If company is already approved or not a COMPANY user
    """
    # Find the user
    result = await session.execute(
        select(User).where(User.id == company_user_id)  # pyright: ignore[reportArgumentType]
    )
    user = result.scalar_one_or_none()
    if not user:
        raise CompanyNotFoundError(f"Company user with ID {company_user_id} not found")

    # Validate it's a COMPANY user
    if user.role != UserRole.COMPANY:
        raise CompanyNotPendingError(
            f"User {company_user_id} is not a COMPANY user (role: {user.role})"
        )

    # Validate it's pending (inactive)
    if user.is_active:
        raise CompanyNotPendingError(
            f"Company user {company_user_id} is already approved (active)"
        )

    # Get company profile for email
    result = await session.execute(
        select(CompanyProfile).where(  # pyright: ignore[reportArgumentType]
            CompanyProfile.user_id == company_user_id
        )
    )
    company_profile = result.scalar_one()
    company_name = company_profile.name
    company_email = user.email

    # Send rejection email to company
    await enqueue_email_task(
        to=company_email,
        subject="Company Registration Rejected",
        body=f"Your company registration for '{company_name}' has been rejected. "
        "If you believe this is an error, please contact support.",
    )

    # Delete company profile first (due to foreign key constraint)
    await session.delete(company_profile)
    await session.flush()

    # Delete user
    await session.delete(user)
