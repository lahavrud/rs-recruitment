"""Authentication endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_session
from src.core.security import create_access_token, get_password_hash, verify_password
from src.models import CompanyProfile, User, UserRole
from src.schemas import (
    CompanyProfileRead,
    LoginRequest,
    TokenResponse,
    UserCreate,
    UserRead,
    UserWithCompanyRead,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/register",
    response_model=UserWithCompanyRead,
    status_code=status.HTTP_201_CREATED,
)
async def register(
    user_data: UserCreate,
    session: AsyncSession = Depends(get_session),
) -> UserWithCompanyRead:
    """Register a new company user.

    Creates a User with COMPANY role and associated CompanyProfile.
    User is inactive until Admin approves (is_active=False).
    """
    # Check if user with email already exists
    result = await session.execute(
        select(User).where(User.email == user_data.email)  # pyright: ignore[reportArgumentType]
    )
    existing_user = result.scalar_one_or_none()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    # Create User with hashed password
    hashed_password = get_password_hash(user_data.password)
    new_user = User(
        email=user_data.email,
        hashed_password=hashed_password,
        role=UserRole.COMPANY,
        is_active=False,  # Requires Admin approval
    )
    session.add(new_user)
    await session.flush()  # Flush to get the user ID

    # Create CompanyProfile
    # After flush, new_user.id is guaranteed to be set
    assert new_user.id is not None, "User ID should be set after flush"
    new_company_profile = CompanyProfile(
        user_id=new_user.id,
        name=user_data.company_profile.name,
        logo_url=user_data.company_profile.logo_url,
        contact_person=user_data.company_profile.contact_person,
        contact_phone=user_data.company_profile.contact_phone,
    )
    session.add(new_company_profile)
    await session.commit()
    await session.refresh(new_user)
    await session.refresh(new_company_profile)

    return UserWithCompanyRead(
        user=UserRead.model_validate(new_user),
        company_profile=CompanyProfileRead.model_validate(new_company_profile),
    )


@router.post("/login", response_model=TokenResponse)
async def login(
    login_data: LoginRequest,
    session: AsyncSession = Depends(get_session),
) -> TokenResponse:
    """Login and receive JWT access token.

    Validates email and password, returns JWT token if credentials are correct.
    """
    # Find user by email
    result = await session.execute(
        select(User).where(User.email == login_data.email)  # pyright: ignore[reportArgumentType]
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    # Verify password
    if not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    # Create access token
    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email, "role": user.role.value}
    )

    return TokenResponse(access_token=access_token)
