"""Account activation endpoint (company + candidate)."""

import logging

from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.infrastructure.database import get_session
from src.core.infrastructure.dependencies import client_ip
from src.core.infrastructure.error_handling import service_exception_to_http
from src.core.infrastructure.transactions import defer_after_commit, transactional
from src.enums import UserRole
from src.services.auth.activation import activate_user
from src.services.exceptions import InvalidActivationTokenError
from src.templates.email import build_candidate_welcome_html

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/activate", status_code=status.HTTP_200_OK)
async def activate(
    request: Request,
    token: str = Query(
        ..., description="One-time activation token from the activation email"
    ),
    session: AsyncSession = Depends(get_session),
) -> dict:
    """Activate a user account (company or candidate) using the one-time token.

    Dispatches by role inside `activate_user`; for candidates this also
    creates / links their CandidateProfile and records consent.
    """
    try:
        async with transactional(session):
            user = await activate_user(
                token,
                session,
                ip_address=client_ip(request),
                user_agent=request.headers.get("user-agent"),
            )
    except InvalidActivationTokenError as e:
        raise service_exception_to_http(e) from e

    # Candidate-only: send the post-activation explainer email after commit.
    # Company welcomes are handled by the existing approval-email flow.
    if user.role == UserRole.CANDIDATE:
        from src.core.infrastructure.config import settings
        from src.core.tasks import enqueue_email_task

        candidate_email = user.email
        jobs_url = f"{settings.frontend_base_url}/jobs"
        profile_url = f"{settings.frontend_base_url}/candidate/profile"

        async def _send_welcome() -> None:
            html = build_candidate_welcome_html(
                jobs_url=jobs_url, profile_url=profile_url
            )
            try:
                await enqueue_email_task(
                    to=candidate_email,
                    subject="ברוכים הבאים ל-RS Recruiting",
                    body=(
                        "החשבון שלכם הופעל. כעת תוכלו להתחבר ולנהל את ההגשות שלכם.\n"
                        f"מועדי משרות פתוחים: {jobs_url}\n"
                        f"פרופיל אישי: {profile_url}\n"
                    ),
                    html_body=html,
                )
            except Exception:  # pragma: no cover — best-effort post-activation
                logger.exception("Failed to enqueue candidate welcome email")

        defer_after_commit(_send_welcome)

    return {"message": "החשבון הופעל בהצלחה"}
