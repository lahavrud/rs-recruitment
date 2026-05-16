"""Prerender routes for static public pages (/about, /contact).

Split out of _routes.py — the dynamic job routes hit the DB while these are
pure content. Keeping them separate also keeps each module under the
src/api/ 200-line cap (see scripts/check_file_sizes.py).
"""

import html

from fastapi import APIRouter
from fastapi.responses import HTMLResponse

from src.core.infrastructure.config import settings

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
    SITE_NAME,
)
from ._render import render_page, site_nav_html

router = APIRouter()


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
