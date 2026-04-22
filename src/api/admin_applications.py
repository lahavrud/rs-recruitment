"""Admin endpoints for application (match) management."""

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.infrastructure.database import get_session
from src.core.infrastructure.dependencies import get_current_admin
from src.core.infrastructure.error_handling import service_exception_to_http
from src.core.tasks import enqueue_email_task
from src.enums import ApplicationStatus
from src.models import User
from src.schemas import ApplicationRead, ApplicationStatusUpdate, ApplicationWithDetails
from src.services.applications_admin import (
    get_application,
    list_applications,
    update_application_status,
)
from src.services.exceptions import (
    ApplicationNotFoundError,
    InvalidApplicationStatusTransitionError,
)

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get(
    "/applications",
    response_model=list[ApplicationWithDetails],
)
async def get_applications(
    status: ApplicationStatus | None = None,
    job_id: int | None = None,
    candidate_id: int | None = None,
    current_admin: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_session),
) -> list[ApplicationWithDetails]:
    """List all applications with optional filtering.

    Supports filtering by status, job, or candidate. Returns full details
    including nested job and candidate information.
    Requires admin authentication.

    Args:
        status: Filter by application status (optional)
        job_id: Filter by job ID (optional)
        candidate_id: Filter by candidate ID (optional)
        current_admin: Current authenticated admin user (from dependency)
        session: Database session

    Returns:
        List of applications with nested job and candidate details
    """
    return await list_applications(
        session, status=status, job_id=job_id, candidate_id=candidate_id
    )


@router.get(
    "/applications/{application_id}",
    response_model=ApplicationWithDetails,
)
async def get_application_detail(
    application_id: int,
    current_admin: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_session),
) -> ApplicationWithDetails:
    """Get a single application with full details.

    Returns the application with nested job and candidate information.
    Requires admin authentication.

    Args:
        application_id: ID of the application to retrieve
        current_admin: Current authenticated admin user (from dependency)
        session: Database session

    Returns:
        Application with nested job and candidate details

    Raises:
        HTTPException: If application not found
    """
    try:
        return await get_application(application_id, session)
    except ApplicationNotFoundError as e:
        raise service_exception_to_http(e) from e


@router.put(
    "/applications/{application_id}/status",
    response_model=ApplicationRead,
    status_code=status.HTTP_200_OK,
)
async def update_application_status_endpoint(
    application_id: int,
    body: ApplicationStatusUpdate,
    current_admin: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_session),
) -> ApplicationRead:
    """Update an application's status and optionally add admin notes.

    Enforces valid status transitions:
    - NEW → APPROVED_BY_ADMIN or REJECTED
    - APPROVED_BY_ADMIN → HIRED or REJECTED
    - REJECTED and HIRED are terminal states

    Sends email notifications to both candidate and company after the
    DB transaction commits, so emails are never enqueued for rolled-back
    changes.
    Requires admin authentication.

    Args:
        application_id: ID of the application to update
        body: Required new status and optional admin notes
        current_admin: Current authenticated admin user (from dependency)
        session: Database session

    Returns:
        Updated application as ApplicationRead schema

    Raises:
        HTTPException: If application not found or transition is invalid
    """
    try:
        result, email_payloads = await update_application_status(
            application_id, body.status, session, admin_notes=body.admin_notes
        )
        await session.commit()
    except (ApplicationNotFoundError, InvalidApplicationStatusTransitionError) as e:
        await session.rollback()
        raise service_exception_to_http(e) from e
    except Exception:
        await session.rollback()
        raise

    # Enqueue emails only after the transaction has committed successfully
    for payload in email_payloads:
        await enqueue_email_task(**payload)

    return result
