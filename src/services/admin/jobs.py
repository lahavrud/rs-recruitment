"""Admin service layer for direct job CRUD.

Separate from `jobs_admin.py` (approval workflow) — these functions let
an admin manage any job in any status, including creating jobs directly
on behalf of a company that hasn't been onboarded yet.
"""

from datetime import datetime, timezone

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.core.infrastructure.config import settings
from src.core.infrastructure.database_helpers import get_by_id_or_raise
from src.core.infrastructure.pagination import (
    CursorPage,
    apply_cursor,
    build_cursor_page,
    clamp_limit,
)
from src.core.infrastructure.transactions import defer_after_commit
from src.core.tasks import enqueue_email_task
from src.enums import JobStatus
from src.models import Application, CompanyProfile, Job
from src.schemas import JobAdminCreate, JobAdminUpdate, JobRead
from src.services.exceptions import CompanyNotFoundError, JobNotFoundError
from src.templates.email import build_job_admin_edited_html

_FIELD_LABELS: dict[str, str] = {
    "title": "כותרת",
    "short_description": "תיאור קצר",
    "description": "תיאור מפורט",
    "requirements": "דרישות",
    "tags": "תגיות",
    "is_featured": "מוצגת",
    "location": "מיקום",
    "salary_min": "שכר מינימום",
    "salary_max": "שכר מקסימום",
    "status": "סטטוס",
}


async def list_jobs(
    session: AsyncSession,
    *,
    status: JobStatus | None = None,
    cursor: str | None = None,
    limit: int | None = None,
) -> CursorPage[JobRead]:
    """One page of jobs across all statuses, newest first.

    `status` filters to a single status when provided (None returns all).
    """
    page_size = clamp_limit(limit)
    base = select(Job)
    if status is not None:
        base = base.where(Job.status == status)  # pyright: ignore[reportArgumentType]
    query = apply_cursor(
        base,
        sort_col=Job.created_at,  # pyright: ignore[reportArgumentType]
        id_col=Job.id,  # pyright: ignore[reportArgumentType]
        cursor=cursor,
        limit=page_size,
    )
    rows = list((await session.execute(query)).scalars().all())
    return build_cursor_page(
        rows,
        serializer=JobRead.model_validate,
        cursor_key=lambda j: (j.created_at, j.id),
        limit=page_size,
    )


async def admin_create_job(data: JobAdminCreate, session: AsyncSession) -> JobRead:
    """Create a job directly under an existing company profile.

    Raises:
        CompanyNotFoundError: If the referenced `company_id` does not exist.
    """
    await get_by_id_or_raise(
        session,
        CompanyProfile,
        data.company_id,
        lambda pk: CompanyNotFoundError(f"Company profile {pk} not found"),
    )

    job = Job(
        company_id=data.company_id,
        title=data.title,
        short_description=data.short_description,
        description=data.description,
        requirements=[r.model_dump() for r in data.requirements],
        tags=list(data.tags),
        is_featured=data.is_featured,
        location=data.location,
        salary_min=data.salary_min,
        salary_max=data.salary_max,
        status=data.status,
    )
    session.add(job)
    await session.flush()
    await session.refresh(job)
    return JobRead.model_validate(job)


async def update_job(
    job_id: int, data: JobAdminUpdate, session: AsyncSession
) -> JobRead:
    """Apply a partial update to a job. Admin can edit any field at any status.

    Notifies the company by email when at least one field changes and the
    company has an attached user account. Admin-created orphan companies
    (no user) are silently skipped.

    Raises:
        JobNotFoundError: If no job with that id exists.
    """
    result = await session.execute(
        select(Job)
        .options(selectinload(Job.company).selectinload(CompanyProfile.user))
        .where(Job.id == job_id)  # pyright: ignore[reportArgumentType]
    )
    job = result.scalar_one_or_none()
    if job is None:
        raise JobNotFoundError(f"Job {job_id} not found")

    # model_dump serializes nested pydantic items (e.g. JobRequirementItem)
    # to plain dicts, which is exactly what the JSONB column wants.
    payload = data.model_dump(exclude_unset=True)

    changed_labels = [
        _FIELD_LABELS.get(field, field)
        for field, value in payload.items()
        if getattr(job, field) != value
    ]
    _old_title = job.title
    _title_changed = "title" in payload and payload["title"] != _old_title

    for field, value in payload.items():
        setattr(job, field, value)
    job.updated_at = datetime.now(timezone.utc)

    await session.flush()

    # Capture notification data before session.refresh() — refresh re-fetches
    # the Job row and expires selectinloaded relationships, making company/user
    # inaccessible via async lazy-load afterward.
    if changed_labels and job.company.user is not None:
        _email = job.company.user.email
        _new_title = job.title
        _former_title: str | None = _old_title if _title_changed else None
        _company_name = job.company.name
        _dashboard_url = f"{settings.frontend_base_url}/login?redirect=/company/jobs"
        _changed_labels = changed_labels
        _plain = (
            f"פרסום המשרה '{_new_title}'"
            + (f" ({_old_title} לשעבר)" if _title_changed else "")
            + f" עודכן על-ידי המנהל. שדות שעודכנו: {', '.join(_changed_labels)}"
        )
        defer_after_commit(
            lambda: enqueue_email_task(
                to=_email,
                subject="פרסום משרה עודכן על-ידי המנהל — RS Recruiting",
                body=_plain,
                html_body=build_job_admin_edited_html(
                    job_title=_new_title,
                    company_name=_company_name,
                    changed_fields=_changed_labels,
                    dashboard_url=_dashboard_url,
                    former_title=_former_title,
                ),
            )
        )

    await session.refresh(job)
    return JobRead.model_validate(job)


async def delete_job(job_id: int, session: AsyncSession) -> None:
    """Hard-delete a job and cascade through its applications.

    Candidate profiles and resume files are preserved — they belong to the
    candidate, not the job.

    Raises:
        JobNotFoundError: If no job with that id exists.
    """
    job = await get_by_id_or_raise(
        session, Job, job_id, lambda pk: JobNotFoundError(f"Job {pk} not found")
    )

    await session.execute(
        delete(Application).where(Application.job_id == job_id)  # pyright: ignore[reportArgumentType]
    )
    await session.delete(job)
    await session.flush()
