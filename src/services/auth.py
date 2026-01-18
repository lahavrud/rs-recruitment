"""Authentication service layer for business logic."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.infrastructure.security import get_password_hash, verify_password
from src.core.tasks import enqueue_email_task
from src.enums import UserRole
from src.models import CompanyProfile, User
from src.schemas import CompanyProfileRead, UserCreate, UserRead, UserWithCompanyRead
from src.services.admin import get_all_admin_emails
from src.services.exceptions import (
    EmailAlreadyExistsError,
    InactiveUserError,
    InvalidCredentialsError,
)


async def register_company_user(
    user_data: UserCreate, session: AsyncSession
) -> UserWithCompanyRead:
    """Register a new company user with associated company profile.

    Creates a User with COMPANY role and associated CompanyProfile.
    User is inactive until Admin approves (is_active=False).

    Args:
        user_data: User creation data including email, password, and company profile
        session: Database session

    Returns:
        UserWithCompanyRead containing the created user and company profile

    Raises:
        EmailAlreadyExistsError: If email is already registered
    """
    # Check if user with email already exists
    result = await session.execute(
        select(User).where(User.email == user_data.email)  # pyright: ignore[reportArgumentType]
    )
    existing_user = result.scalar_one_or_none()
    if existing_user:
        raise EmailAlreadyExistsError(user_data.email)

    # Create User with hashed password
    hashed_password = get_password_hash(user_data.password)
    new_user = User(
        email=user_data.email,
        hashed_password=hashed_password,
        role=UserRole.COMPANY,
        is_active=False,  # Requires Admin approval
    )
    session.add(new_user)
    await session.flush()

    # Create CompanyProfile (new_user.id is set after flush)
    new_company_profile = CompanyProfile(
        user_id=new_user.id,
        name=user_data.company_profile.name,
        logo_url=user_data.company_profile.logo_url,
        contact_person=user_data.company_profile.contact_person,
        contact_phone=user_data.company_profile.contact_phone,
    )
    session.add(new_company_profile)
    await session.flush()  # Flush to get CompanyProfile.id for schema validation

    # Send email notification to all admins about new company registration
    admin_emails = await get_all_admin_emails(session)
    if admin_emails:
        company_info = (
            f"A new company '{new_company_profile.name}' has registered "
            "and is pending approval.\n\n"
            f"Company: {new_company_profile.name}\n"
            f"Contact: {new_company_profile.contact_person or 'N/A'}\n"
            f"Email: {new_user.email}\n"
            f"Phone: {new_company_profile.contact_phone or 'N/A'}\n\n"
            "Please review and approve or reject the registration."
        )
        await enqueue_email_task(
            to=admin_emails,
            subject="New Company Registration Pending Approval",
            body=company_info,
        )

    return UserWithCompanyRead(
        user=UserRead.model_validate(new_user),
        company_profile=CompanyProfileRead.model_validate(new_company_profile),
    )


async def authenticate_user(email: str, password: str, session: AsyncSession) -> User:
    """Authenticate a user by email and password.

    Validates email and password, checks if user is active.

    Args:
        email: User email address
        password: Plain text password
        session: Database session

    Returns:
        Authenticated User object

    Raises:
        InvalidCredentialsError: If email or password is incorrect
        InactiveUserError: If user exists but is inactive
    """
    # Find user by email
    result = await session.execute(
        select(User).where(User.email == email)  # pyright: ignore[reportArgumentType]
    )
    user = result.scalar_one_or_none()
    if not user:
        raise InvalidCredentialsError("Incorrect email or password")

    # Verify password
    if not verify_password(password, user.hashed_password):
        raise InvalidCredentialsError("Incorrect email or password")

    # Check if user is active
    if not user.is_active:
        raise InactiveUserError("Account is inactive. Please wait for admin approval.")

    return user
