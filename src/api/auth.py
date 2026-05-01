"""Authentication endpoints."""

import json

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    Request,
    UploadFile,
    status,
)
from pydantic import ValidationError as PydanticValidationError
from sqlalchemy import exc as sqlalchemy_exc
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.infrastructure.database import get_session
from src.core.infrastructure.error_handling import service_exception_to_http
from src.core.infrastructure.invite_tokens import (
    consume_invite_token,
    validate_invite_token,
)
from src.core.infrastructure.limiter import get_limiter
from src.core.infrastructure.security import create_access_token
from src.schemas import (
    CompanyProfileCreate,
    LoginRequest,
    TokenResponse,
    UserCreate,
    UserWithCompanyRead,
)
from src.services.auth import authenticate_user, register_company_user
from src.services.exceptions import (
    EmailAlreadyExistsError,
    InactiveUserError,
    InvalidCredentialsError,
    InvalidInviteTokenError,
)

limiter = get_limiter()
router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/register",
    response_model=UserWithCompanyRead,
    status_code=status.HTTP_201_CREATED,
)
@limiter.limit("3/hour")
async def register(
    request: Request,
    token: str = Query(..., description="Single-use invite token issued by an admin"),
    email: str = Form(...),
    password: str = Form(...),
    company_name: str = Form(...),
    company_id: str = Form(...),
    contact_first_name: str = Form(...),
    contact_last_name: str = Form(...),
    contact_mobile_phone: str = Form(...),
    contact_landline_phone: str | None = Form(None),
    logo: UploadFile = File(...),
    session: AsyncSession = Depends(get_session),
) -> UserWithCompanyRead:
    """Register a new company user.

    Accepts multipart/form-data with company fields + logo file.
    Requires a valid single-use invite token issued by an admin.
    Creates a User with COMPANY role and associated CompanyProfile.
    User is inactive until Admin approves (is_active=False).
    """
    try:
        profile_data = CompanyProfileCreate(
            name=company_name,
            company_id=company_id,
            contact_first_name=contact_first_name,
            contact_last_name=contact_last_name,
            contact_mobile_phone=contact_mobile_phone,
            contact_landline_phone=contact_landline_phone,
        )
        user_create = UserCreate(
            email=email, password=password, company_profile=profile_data
        )
    except PydanticValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=json.loads(exc.json()),
        ) from exc

    logo_content = await logo.read()
    logo_filename = logo.filename or "logo"
    logo_content_type = logo.content_type

    try:
        await validate_invite_token(token)
        result = await register_company_user(
            user_create, session, logo_content, logo_filename, logo_content_type
        )
        await session.commit()
        await consume_invite_token(token)
        return result
    except InvalidInviteTokenError as e:
        raise service_exception_to_http(e) from e
    except EmailAlreadyExistsError as e:
        await session.rollback()
        raise service_exception_to_http(e) from e
    except ValueError as e:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        ) from e
    except sqlalchemy_exc.IntegrityError as e:
        await session.rollback()
        error_str = str(e.orig) if e.orig else str(e)
        if "email" in error_str.lower() or "unique" in error_str.lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"User with email '{email}' already exists.",
            ) from e
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error occurred during registration",
        ) from e
    except Exception:
        await session.rollback()
        raise


@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute")
async def login(
    request: Request,
    login_data: LoginRequest,
    session: AsyncSession = Depends(get_session),
) -> TokenResponse:
    """Login and receive JWT access token.

    Validates email and password, returns JWT token if credentials are correct.
    """
    try:
        user = await authenticate_user(login_data.email, login_data.password, session)
    except (InvalidCredentialsError, InactiveUserError) as e:
        raise service_exception_to_http(e) from e

    # Create access token
    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email, "role": user.role.value}
    )

    return TokenResponse(access_token=access_token)
