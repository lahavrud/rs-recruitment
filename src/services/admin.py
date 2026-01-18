"""Admin service layer for company approval workflow."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.tasks import enqueue_email_task
from src.enums import UserRole
from src.models import CompanyProfile, User
from src.schemas import CompanyProfileRead, UserRead
from src.services.exceptions import CompanyNotFoundError, CompanyNotPendingError


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
