"""Admin endpoints for company approval and direct CRUD."""

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.infrastructure.database import get_session
from src.core.infrastructure.dependencies import get_current_admin
from src.core.infrastructure.error_handling import service_exception_to_http
from src.models import User
from src.schemas import (
    ActiveCompanyRead,
    ApprovedCompanyRead,
    CompanyProfileAdminCreate,
    CompanyProfileAdminUpdate,
    CompanyProfileRead,
    PendingCompanyRead,
)
from src.services.admin_companies import (
    approve_company,
    delete_active_company,
    list_active_companies,
    list_pending_companies,
    reject_company,
)
from src.services.admin_company_profiles import (
    admin_create_company,
    get_company_profile,
    update_company_profile,
)
from src.services.exceptions import (
    CompanyNotFoundError,
    CompanyNotPendingError,
)

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get(
    "/companies",
    response_model=list[ActiveCompanyRead],
)
async def get_active_companies(
    current_admin: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_session),
) -> list[ActiveCompanyRead]:
    """List all active companies."""
    return await list_active_companies(session)


@router.post(
    "/companies",
    response_model=CompanyProfileRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_company_directly(
    data: CompanyProfileAdminCreate,
    current_admin: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_session),
) -> CompanyProfileRead:
    """Create a CompanyProfile directly, without a user account.

    The resulting profile has `user_id = null` and can be referenced by jobs
    immediately. Admins use this for companies that haven't been onboarded
    via the invite flow yet.
    """
    try:
        result = await admin_create_company(data, session)
        await session.commit()
        return result
    except Exception:
        await session.rollback()
        raise


@router.get(
    "/companies/profile/{profile_id}",
    response_model=CompanyProfileRead,
)
async def get_company_profile_endpoint(
    profile_id: int,
    current_admin: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_session),
) -> CompanyProfileRead:
    """Fetch a single CompanyProfile by its primary key."""
    try:
        return await get_company_profile(profile_id, session)
    except CompanyNotFoundError as e:
        raise service_exception_to_http(e) from e


@router.put(
    "/companies/profile/{profile_id}",
    response_model=CompanyProfileRead,
)
async def update_company_profile_endpoint(
    profile_id: int,
    data: CompanyProfileAdminUpdate,
    current_admin: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_session),
) -> CompanyProfileRead:
    """Partially update a CompanyProfile."""
    try:
        result = await update_company_profile(profile_id, data, session)
        await session.commit()
        return result
    except CompanyNotFoundError as e:
        await session.rollback()
        raise service_exception_to_http(e) from e
    except Exception:
        await session.rollback()
        raise


@router.delete(
    "/companies/{company_user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_company(
    company_user_id: int,
    current_admin: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_session),
) -> None:
    """Hard-delete a company and all its jobs and applications."""
    try:
        await delete_active_company(company_user_id, session)
        await session.commit()
    except CompanyNotFoundError as e:
        await session.rollback()
        raise service_exception_to_http(e) from e
    except Exception:
        await session.rollback()
        raise


@router.get(
    "/companies/pending",
    response_model=list[PendingCompanyRead],
)
async def get_pending_companies(
    current_admin: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_session),
) -> list[PendingCompanyRead]:
    """List all pending company registrations."""
    companies = await list_pending_companies(session)
    return [PendingCompanyRead.model_validate(c) for c in companies]


@router.post(
    "/companies/{company_user_id}/approve",
    response_model=ApprovedCompanyRead,
    status_code=status.HTTP_200_OK,
)
async def approve_company_registration(
    company_user_id: int,
    current_admin: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_session),
) -> ApprovedCompanyRead:
    """Approve a company registration."""
    try:
        result = await approve_company(company_user_id, session)
        await session.commit()
        return ApprovedCompanyRead.model_validate(result)
    except (CompanyNotFoundError, CompanyNotPendingError) as e:
        await session.rollback()
        raise service_exception_to_http(e) from e
    except Exception:
        await session.rollback()
        raise


@router.post(
    "/companies/{company_user_id}/reject",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def reject_company_registration(
    company_user_id: int,
    current_admin: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_session),
) -> None:
    """Reject a company registration."""
    try:
        await reject_company(company_user_id, session)
        await session.commit()
    except (CompanyNotFoundError, CompanyNotPendingError) as e:
        await session.rollback()
        raise service_exception_to_http(e) from e
    except Exception:
        await session.rollback()
        raise
