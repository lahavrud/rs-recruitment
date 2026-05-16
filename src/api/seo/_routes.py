"""FastAPI routes for /api/og/* prerender endpoints."""

import html

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import HTMLResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.infrastructure.config import settings
from src.core.infrastructure.database import get_session
from src.enums import JobStatus
from src.models import Job

from . import _jsonld as jsonld
from ._content import (
    ABOUT_DESCRIPTION,
    ABOUT_HEADLINE,
    ABOUT_PROCESS_STEPS,
    ABOUT_STORY_PARAGRAPHS,
    ABOUT_TITLE,
    ABOUT_VALUES,
    CONTACT_DESCRIPTION,
    CONTACT_EMAIL,
    CONTACT_HEADLINE,
    CONTACT_SUBTITLE,
    CONTACT_TITLE,
    HOME_DESCRIPTION,
    HOME_HEADLINE,
    JOBS_DESCRIPTION,
    JOBS_HEADLINE,
    JOBS_INDEX_LIMIT,
    SITE_NAME,
)
from ._render import format_salary, render_page, site_nav_html

router = APIRouter()


@router.get("/api/og/home", response_class=HTMLResponse, include_in_schema=False)
async def og_home(
    session: AsyncSession = Depends(get_session),
) -> HTMLResponse:
    """Server-rendered landing page for crawlers."""
    site_url = settings.frontend_base_url
    title = f"{HOME_HEADLINE} — {SITE_NAME}"

    result = await session.execute(
        select(Job)
        .where(Job.status == JobStatus.PUBLISHED)  # pyright: ignore[reportArgumentType]
        .order_by(Job.is_featured.desc(), Job.created_at.desc())  # pyright: ignore[reportAttributeAccessIssue]
        .limit(6)
    )
    featured = list(result.scalars().all())

    e = html.escape
    items = "".join(
        f'  <li><a href="{e(site_url)}/jobs/{j.id}">'
        f"<strong>{e(j.title)}</strong> — {e(j.location)}</a></li>\n"
        for j in featured
    )
    body_html = (
        f"<header>\n  <h1>{e(HOME_HEADLINE)}</h1>\n"
        f"  <p>{e(HOME_DESCRIPTION)}</p>\n</header>\n"
        f"{site_nav_html(site_url)}"
        f'<section aria-label="משרות נבחרות">\n'
        f"  <h2>משרות נבחרות</h2>\n"
        f"  <ul>\n{items}  </ul>\n"
        f'  <p><a href="{e(site_url)}/jobs">לכל המשרות</a></p>\n'
        f"</section>\n"
    )

    return render_page(
        title=title,
        description=HOME_DESCRIPTION,
        canonical=f"{site_url}/",
        og_type="website",
        body_html=body_html,
        graph=jsonld.site(site_url),
    )


@router.get("/api/og/jobs", response_class=HTMLResponse, include_in_schema=False)
async def og_jobs_index(
    session: AsyncSession = Depends(get_session),
) -> HTMLResponse:
    """Server-rendered job board for crawlers."""
    site_url = settings.frontend_base_url
    title = f"{JOBS_HEADLINE} — {SITE_NAME}"

    result = await session.execute(
        select(Job)
        .where(Job.status == JobStatus.PUBLISHED)  # pyright: ignore[reportArgumentType]
        .order_by(Job.is_featured.desc(), Job.created_at.desc())  # pyright: ignore[reportAttributeAccessIssue]
        .limit(JOBS_INDEX_LIMIT)
    )
    jobs = list(result.scalars().all())

    e = html.escape
    items = []
    for j in jobs:
        salary = format_salary(j.salary_min, j.salary_max)
        salary_html = f"      <span>{e(salary)}</span>\n" if salary else ""
        items.append(
            f'    <li>\n      <a href="{e(site_url)}/jobs/{j.id}">'
            f"<strong>{e(j.title)}</strong></a>\n"
            f"      <span>{e(j.location)}</span>\n"
            f"{salary_html}"
            f"    </li>\n"
        )
    list_html = "".join(items) or "    <li>אין כרגע משרות פתוחות.</li>\n"

    body_html = (
        f"<header>\n  <h1>{e(JOBS_HEADLINE)}</h1>\n"
        f"  <p>{e(JOBS_DESCRIPTION)}</p>\n</header>\n"
        f"{site_nav_html(site_url)}"
        f'<section aria-label="רשימת משרות">\n'
        f"  <ul>\n{list_html}  </ul>\n"
        f"</section>\n"
    )

    graph: list[dict] = [
        jsonld.breadcrumb([(SITE_NAME, site_url), (JOBS_HEADLINE, f"{site_url}/jobs")])
    ]
    if jobs:
        graph.append(jsonld.item_list(jobs, site_url))

    return render_page(
        title=title,
        description=JOBS_DESCRIPTION,
        canonical=f"{site_url}/jobs",
        og_type="website",
        body_html=body_html,
        graph=graph,
    )


@router.get(
    "/api/og/jobs/{job_id}",
    response_class=HTMLResponse,
    include_in_schema=False,
)
async def og_job(
    job_id: int,
    session: AsyncSession = Depends(get_session),
) -> HTMLResponse:
    """Server-rendered job-detail page for crawlers.

    nginx routes /jobs/:id here for social scrapers (LinkedIn, WhatsApp, …)
    and search-engine crawlers (Googlebot). Real browsers fall through to
    the SPA.
    """
    job = (
        await session.execute(
            select(Job).where(Job.id == job_id, Job.status == JobStatus.PUBLISHED)  # pyright: ignore[reportArgumentType]
        )
    ).scalar_one_or_none()
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")

    site_url = settings.frontend_base_url
    canonical = f"{site_url}/jobs/{job.id}"
    description = job.description.strip().replace("\n", " ")
    title = f"{job.title} — {SITE_NAME}"

    e = html.escape
    salary = format_salary(job.salary_min, job.salary_max)
    requirements_html = "".join(
        f"    <li>{e(req['text'])}</li>\n"
        for req in job.requirements
        if isinstance(req, dict) and req.get("text")
    )
    description_paragraphs = "".join(
        f"  <p>{e(p.strip())}</p>\n" for p in job.description.split("\n\n") if p.strip()
    )

    body_html = (
        f"<header>\n  <h1>{e(job.title)}</h1>\n"
        f"  <p><strong>מיקום:</strong> {e(job.location)}</p>\n"
        + (f"  <p><strong>שכר:</strong> {e(salary)}</p>\n" if salary else "")
        + "</header>\n"
        + site_nav_html(site_url)
        + '<section aria-label="תיאור המשרה">\n  <h2>תיאור המשרה</h2>\n'
        + description_paragraphs
        + "</section>\n"
        + (
            '<section aria-label="דרישות התפקיד">\n  <h2>דרישות התפקיד</h2>\n'
            f"  <ul>\n{requirements_html}  </ul>\n</section>\n"
            if requirements_html
            else ""
        )
        + f'<p><a href="{e(canonical)}/apply">להגיש מועמדות</a></p>\n'
    )

    graph: list[dict] = [
        jsonld.job_posting(job, site_url),
        jsonld.breadcrumb(
            [
                (SITE_NAME, site_url),
                (JOBS_HEADLINE, f"{site_url}/jobs"),
                (job.title, canonical),
            ]
        ),
    ]

    return render_page(
        title=title,
        description=description,
        canonical=canonical,
        og_type="article",
        body_html=body_html,
        graph=graph,
    )


@router.get("/api/og/about", response_class=HTMLResponse, include_in_schema=False)
async def og_about() -> HTMLResponse:
    """Server-rendered /about for crawlers.

    Static — no DB access. Mirrors the SPA's AboutPage content surface so
    Google's dynamic-rendering parity rule holds: same title, headline, story,
    values, and process that JS-rendered users see.
    """
    site_url = settings.frontend_base_url
    e = html.escape

    values_html = "".join(
        f"  <li>\n    <h3>{e(title)}</h3>\n    <p>{e(body)}</p>\n  </li>\n"
        for title, body in ABOUT_VALUES
    )
    steps_html = "".join(
        f"  <li>\n    <h3>{e(title)}</h3>\n    <p>{e(body)}</p>\n  </li>\n"
        for title, body in ABOUT_PROCESS_STEPS
    )
    story_html = "".join(f"  <p>{e(p)}</p>\n" for p in ABOUT_STORY_PARAGRAPHS)

    body_html = (
        f"<header>\n  <h1>{e(ABOUT_HEADLINE)}</h1>\n"
        f"  <p>{e(ABOUT_DESCRIPTION)}</p>\n</header>\n"
        f"{site_nav_html(site_url)}"
        f'<section aria-label="הסיפור שלנו">\n  <h2>הסיפור שלנו</h2>\n'
        f"{story_html}</section>\n"
        f'<section aria-label="הערכים שלנו">\n  <h2>הערכים שלנו</h2>\n'
        f"  <ul>\n{values_html}  </ul>\n</section>\n"
        f'<section aria-label="איך זה עובד">\n  <h2>איך זה עובד</h2>\n'
        f"  <ol>\n{steps_html}  </ol>\n</section>\n"
        f'<p><a href="{e(site_url)}/contact">צרו קשר</a></p>\n'
    )

    graph: list[dict] = [
        *jsonld.site(site_url),
        jsonld.breadcrumb([(SITE_NAME, site_url), ("אודות", f"{site_url}/about")]),
    ]

    return render_page(
        title=ABOUT_TITLE,
        description=ABOUT_DESCRIPTION,
        canonical=f"{site_url}/about",
        og_type="website",
        body_html=body_html,
        graph=graph,
    )


@router.get("/api/og/contact", response_class=HTMLResponse, include_in_schema=False)
async def og_contact() -> HTMLResponse:
    """Server-rendered /contact for crawlers."""
    site_url = settings.frontend_base_url
    e = html.escape

    body_html = (
        f"<header>\n  <h1>{e(CONTACT_HEADLINE)}</h1>\n"
        f"  <p>{e(CONTACT_SUBTITLE)}</p>\n</header>\n"
        f"{site_nav_html(site_url)}"
        f'<section aria-label="פרטי קשר">\n'
        f'  <p><strong>דוא"ל:</strong> '
        f'<a href="mailto:{e(CONTACT_EMAIL)}">{e(CONTACT_EMAIL)}</a></p>\n'
        f"</section>\n"
    )

    graph: list[dict] = [
        *jsonld.site(site_url),
        jsonld.breadcrumb([(SITE_NAME, site_url), ("צרו קשר", f"{site_url}/contact")]),
    ]

    return render_page(
        title=CONTACT_TITLE,
        description=CONTACT_DESCRIPTION,
        canonical=f"{site_url}/contact",
        og_type="website",
        body_html=body_html,
        graph=graph,
    )
