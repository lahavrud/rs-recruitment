"""Approval flow for pending company registrations.

Extracted from `admin_companies.py` to keep that module under the file size
limit. Imports remain backward-compatible: `admin_companies` re-exports
`approve_company` so existing call sites and tests are unaffected.
"""

from __future__ import annotations

import logging
import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.infrastructure.config import settings
from src.core.infrastructure.transactions import defer_after_commit
from src.core.services.storage import get_storage_provider
from src.core.tasks import enqueue_email_task
from src.enums import UserRole
from src.models import ActivationToken, CompanyProfile, User
from src.schemas import CompanyProfileRead, UserRead
from src.services.audit import record_audit_event
from src.services.contract_pdf import generate_signed_contract
from src.services.exceptions import CompanyNotFoundError, CompanyNotPendingError
from src.templates.email import build_approval_html

_ACTIVATION_TTL_HOURS = 48
_logger = logging.getLogger(__name__)


async def approve_company(
    company_user_id: int,
    session: AsyncSession,
    *,
    actor_user_id: int | None = None,
    ip_address: str | None = None,
) -> dict:
    """Approve a pending company registration.

    Generates an activation token, builds the signed contract PDF, and emails
    the company an activation link with the PDF attached.  The account is NOT
    activated here — the company must click the link.

    Raises:
        CompanyNotFoundError: If company user not found
        CompanyNotPendingError: If already approved or not a COMPANY user
    """
    result = await session.execute(
        select(User).where(User.id == company_user_id)  # pyright: ignore[reportArgumentType]
    )
    user = result.scalar_one_or_none()
    if not user:
        raise CompanyNotFoundError(f"Company user with ID {company_user_id} not found")
    if user.role != UserRole.COMPANY:
        raise CompanyNotPendingError(
            f"User {company_user_id} is not a COMPANY user (role: {user.role})"
        )
    if user.is_active:
        raise CompanyNotPendingError(
            f"Company user {company_user_id} is already approved (active)"
        )

    # Revoke any previous (unused, possibly expired) activation token before
    # issuing a new one. This allows re-approval after a token expires or
    # after the admin rejects and later changes their mind.
    stale_result = await session.execute(
        select(ActivationToken).where(
            ActivationToken.company_user_id == company_user_id,  # type: ignore[arg-type]
            ActivationToken.used == False,  # noqa: E712
        )
    )
    stale = stale_result.scalar_one_or_none()
    if stale is not None:
        await session.delete(stale)
        await session.flush()

    result = await session.execute(
        select(CompanyProfile).where(  # pyright: ignore[reportArgumentType]
            CompanyProfile.user_id == company_user_id
        )
    )
    company_profile = result.scalar_one()

    raw_token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=_ACTIVATION_TTL_HOURS)
    activation = ActivationToken(
        token=raw_token,
        company_user_id=company_user_id,
        expires_at=expires_at,
    )
    session.add(activation)
    await session.flush()

    activation_url = f"{settings.frontend_base_url}/activate?token={raw_token}"

    _user_email = user.email
    _company_name = company_profile.name or ""
    _company_id_str = company_profile.company_id or ""
    _address = company_profile.address or ""
    _sig_url = company_profile.agreement_signature_url
    _signed_at = company_profile.agreement_signed_at or datetime.now(timezone.utc)
    _activation_url = activation_url

    async def _send_approval_email_with_pdf() -> None:
        pdf_bytes: bytes | None = None
        try:
            storage = get_storage_provider()
            if _sig_url:
                sig_bytes = await storage.download_file(_sig_url)
                pdf_bytes = await generate_signed_contract(
                    company_name=_company_name,
                    company_id=_company_id_str,
                    address=_address,
                    signed_at=_signed_at,
                    company_signature_png_bytes=sig_bytes,
                )
        except Exception:
            # PDF generation is best-effort — send approval email without attachment
            _logger.exception(
                "Failed to generate signed contract for company %s", _user_email
            )

        plain = (
            f"שלום,\n\n"
            f"בקשת ההרשמה של {_company_name} אושרה.\n\n"
            f"לחצו על הקישור להפעלת החשבון:\n{_activation_url}\n\n"
            "בברכה,\nצוות RS Recruiting"
        )
        html = build_approval_html(_company_name, _activation_url)
        attachments = (
            [("חוזה-RS.pdf", pdf_bytes, "application/pdf")] if pdf_bytes else None
        )
        await enqueue_email_task(
            to=_user_email,
            subject="בקשת ההרשמה שלכם אושרה – RS Recruiting",
            body=plain,
            html_body=html,
            attachments=attachments,
        )

    defer_after_commit(_send_approval_email_with_pdf)

    await record_audit_event(
        session,
        actor_user_id=actor_user_id,
        action="company.approve",
        target_type="CompanyProfile",
        target_id=company_profile.id,
        ip_address=ip_address,
    )

    return {
        "user": UserRead.model_validate(user),
        "company_profile": CompanyProfileRead.model_validate(company_profile),
    }
