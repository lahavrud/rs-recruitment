"""Authentication service layer for business logic."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.infrastructure.security import get_password_hash, verify_password
from src.models import CompanyProfile, User, UserRole
from src.schemas import CompanyProfileRead, UserCreate, UserRead, UserWithCompanyRead
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
