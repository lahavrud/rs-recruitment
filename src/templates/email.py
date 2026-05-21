"""Transactional email builder — Jinja2 templates + premailer CSS inlining.

Each build_* function is a thin wrapper that passes typed data to the
corresponding Jinja2 template under src/templates/emails/. premailer
inlines the <style> block into each element for broad email-client
compatibility; @media queries (dark/light mode) are preserved in a
retained <style> tag.

Call sites are unchanged from the previous Python-string approach —
all build_* signatures are identical.
"""

import base64
import logging
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape
from markupsafe import Markup, escape
from premailer import transform as _premailer_transform

from src.core.infrastructure.config import settings as _settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Jinja2 environment
# ---------------------------------------------------------------------------

_TEMPLATES_DIR = Path(__file__).parent / "emails"

_env = Environment(
    loader=FileSystemLoader(str(_TEMPLATES_DIR)),
    autoescape=select_autoescape(["html"]),
    trim_blocks=True,
    lstrip_blocks=True,
)


def _company_filter(name: str) -> Markup:
    """Copper-accent company name — mirrors <CompanyName> in the frontend."""
    return Markup(f'<span style="color:#B87333;font-weight:500;">{escape(name)}</span>')


_env.filters["company"] = _company_filter


_LOGO_PATH = Path(__file__).parent.parent / "assets" / "rs-logo-email.png"


def _logo_src() -> str | None:
    """Return logo src — URL in production, base64 PNG for local dev (Mailpit)."""
    if _settings.logo_public_url:
        return _settings.logo_public_url
    if _LOGO_PATH.exists():
        encoded = base64.b64encode(_LOGO_PATH.read_bytes()).decode()
        return f"data:image/png;base64,{encoded}"
    return None


# ---------------------------------------------------------------------------
# Renderer
# ---------------------------------------------------------------------------


def _render(template_name: str, **kwargs) -> str:
    kwargs.setdefault("logo_src", _logo_src())
    html = _env.get_template(template_name).render(**kwargs)
    return _premailer_transform(
        html,
        keep_style_tags=True,
        remove_classes=False,
        strip_important=False,
        disable_validation=True,
        cssutils_logging_level=logging.CRITICAL,
    )


# ---------------------------------------------------------------------------
# Public build_* functions  (signatures unchanged from previous version)
# ---------------------------------------------------------------------------


def build_invite_html(registration_url: str, contact_name: str | None = None) -> str:
    return _render(
        "invite.html",
        subject="הזמנה להרשמה — RS Recruiting",
        preheader="הוזמנתם להצטרף לפלטפורמת RS Recruiting. הקישור תקף לשעתיים.",
        registration_url=registration_url,
        contact_name=contact_name,
    )


def build_approval_html(company_name: str, activation_url: str) -> str:
    return _render(
        "approval.html",
        subject=f"הבקשה של {company_name} אושרה — RS Recruiting",
        preheader=f"בקשת ההרשמה של {company_name} אושרה. לחצו להפעלת החשבון.",
        company_name=company_name,
        activation_url=activation_url,
    )


def build_candidate_activation_html(activation_url: str, ttl_hours: int) -> str:
    return _render(
        "candidate_activation.html",
        subject="הפעלת חשבון מועמד — RS Recruiting",
        preheader="עוד צעד אחד — לחצו להפעלת החשבון ולתחילת השימוש בפלטפורמה.",
        activation_url=activation_url,
        ttl_hours=ttl_hours,
    )


def build_candidate_welcome_html(jobs_url: str, profile_url: str) -> str:
    return _render(
        "candidate_welcome.html",
        subject="ברוכים הבאים ל-RS Recruiting",
        preheader="החשבון שלכם פעיל. עיינו במשרות הפתוחות והתחילו להגיש.",
        jobs_url=jobs_url,
        profile_url=profile_url,
    )


def build_rejection_html(company_name: str) -> str:
    return _render(
        "rejection.html",
        subject="עדכון בנוגע לבקשת ההרשמה — RS Recruiting",
        preheader=f"עדכון בנוגע לבקשת ההרשמה של {company_name}.",
        company_name=company_name,
    )


def build_new_registration_html(
    company_name: str,
    company_id: str,
    address: str,
    contact_name: str,
    email: str,
    mobile: str,
    admin_url: str,
) -> str:
    return _render(
        "new_registration.html",
        subject=f"בקשת הרשמה חדשה — {company_name}",
        preheader=f"{company_name} השלימה את ההרשמה וממתינה לאישור.",
        company_name=company_name,
        company_id=company_id,
        address=address,
        contact_name=contact_name,
        email=email,
        mobile=mobile,
        admin_url=admin_url,
    )


def build_password_reset_html(reset_url: str) -> str:
    return _render(
        "password_reset.html",
        subject="איפוס סיסמה — RS Recruiting",
        preheader="לחצו להגדרת סיסמה חדשה. הקישור תקף ל-60 דקות.",
        reset_url=reset_url,
    )


def build_new_job_html(
    job_title: str,
    company_name: str,
    location: str,
    job_id: int,
    admin_url: str,
) -> str:
    return _render(
        "new_job.html",
        subject=f"משרה חדשה לאישור — {job_title}",
        preheader=f"{company_name} פרסמה משרה חדשה: {job_title}.",
        job_title=job_title,
        company_name=company_name,
        location=location,
        job_id=job_id,
        admin_url=admin_url,
    )


def build_job_updated_html(
    job_title: str,
    company_name: str,
    location: str,
    job_id: int,
    status: str,
    admin_url: str,
) -> str:
    return _render(
        "job_updated.html",
        subject=f"עדכון משרה — {job_title}",
        preheader=f"המשרה {job_title} של {company_name} עודכנה.",
        job_title=job_title,
        company_name=company_name,
        location=location,
        job_id=job_id,
        status=status,
        admin_url=admin_url,
    )


def build_job_contact_html(
    job_title: str,
    company_name: str,
    admin_note: str,
) -> str:
    return _render(
        "job_contact.html",
        subject=f"פנייה בנוגע למשרה — {job_title}",
        preheader=f"פנייה ממנהל המערכת בנוגע למשרת {job_title}.",
        job_title=job_title,
        company_name=company_name,
        admin_note=admin_note,
    )


def build_application_received_html(
    candidate_name: str,
    job_title: str,
    company_name: str = "",  # kept for call-site compatibility; never rendered
) -> str:
    return _render(
        "application_received.html",
        subject=f"מועמדותך למשרת {job_title} התקבלה — RS Recruiting",
        preheader=f"קיבלנו את מועמדותך למשרת {job_title}. נחזור אליך בקרוב.",
        candidate_name=candidate_name,
        job_title=job_title,
    )


def build_new_application_admin_html(
    candidate_name: str,
    candidate_email: str,
    candidate_phone: str | None,
    candidate_linkedin: str | None,
    job_title: str,
    company_name: str,
    admin_url: str,
) -> str:
    return _render(
        "new_application_admin.html",
        subject=f"מועמדות חדשה — {job_title} / {company_name}",
        preheader=f"{candidate_name} הגיש/ה מועמדות למשרת {job_title}.",
        candidate_name=candidate_name,
        candidate_email=candidate_email,
        candidate_phone=candidate_phone,
        candidate_linkedin=candidate_linkedin,
        job_title=job_title,
        company_name=company_name,
        admin_url=admin_url,
    )


def build_job_admin_edited_html(
    job_title: str,
    company_name: str,
    changed_fields: list[str],
    dashboard_url: str,
    former_title: str | None = None,
) -> str:
    return _render(
        "job_admin_edited.html",
        subject=f"פרסום משרה עודכן על-ידי המנהל — {job_title}",
        preheader=f"מנהל המערכת עדכן את משרת {job_title}.",
        job_title=job_title,
        company_name=company_name,
        changed_fields=changed_fields,
        dashboard_url=dashboard_url,
        former_title=former_title,
    )


def build_data_export_ready_html(download_url: str, ttl_hours: int) -> str:
    return _render(
        "data_export_ready.html",
        subject="ייצוא הנתונים שלכם מוכן — RS Recruiting",
        preheader="הנתונים האישיים שביקשתם מוכנים להורדה. הקישור תקף לשעות ספורות.",
        download_url=download_url,
        ttl_hours=ttl_hours,
    )
