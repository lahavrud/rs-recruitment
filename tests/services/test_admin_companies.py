"""Unit tests for admin_companies service layer."""

from unittest.mock import AsyncMock, patch

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.infrastructure.security import get_password_hash
from src.enums import UserRole
from src.models import Application, CandidateProfile, CompanyProfile, Job, User
from src.schemas import (
    CompanyProfileAdminCreate,
    CompanyProfileAdminUpdate,
    CompanyProfileCreate,
    UserCreate,
)
from src.services.admin_companies import (
    admin_create_company,
    approve_company,
    delete_active_company,
    get_all_admin_emails,
    get_company_profile,
    list_active_companies,
    list_pending_companies,
    reject_company,
    update_company_profile,
)
from src.services.auth import register_company_user
from src.services.exceptions import CompanyNotFoundError, CompanyNotPendingError
from tests.factories import FAKE_LOGO as _LOGO
from tests.factories import FAKE_SIG_B64 as _SIG


def _company_create(email: str, name: str) -> UserCreate:
    return UserCreate(
        email=email,
        password="SecurePass1!",
        company_profile=CompanyProfileCreate(
            name=name,
            company_id="123456789",
            address="רח׳ הדוגמה 1, תל אביב",
            contact_first_name="ישראל",
            contact_last_name="ישראלי",
            contact_mobile_phone="0501234567",
        ),
    )


async def _register(data: UserCreate, session: AsyncSession) -> User:
    result = await register_company_user(
        data, session, _LOGO, "logo.png", "image/png", _SIG
    )
    await session.commit()
    return result.user


# ── get_all_admin_emails ──────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_get_all_admin_emails(session: AsyncSession):
    admin1 = User(
        email="admin1@example.com",
        hashed_password=get_password_hash("password"),
        role=UserRole.ADMIN,
        is_active=True,
    )
    admin2 = User(
        email="admin2@example.com",
        hashed_password=get_password_hash("password"),
        role=UserRole.ADMIN,
        is_active=True,
    )
    inactive_admin = User(
        email="admin3@example.com",
        hashed_password=get_password_hash("password"),
        role=UserRole.ADMIN,
        is_active=False,
    )
    company = User(
        email="company@example.com",
        hashed_password=get_password_hash("password"),
        role=UserRole.COMPANY,
        is_active=True,
    )
    session.add_all([admin1, admin2, inactive_admin, company])
    await session.commit()

    emails = await get_all_admin_emails(session)
    assert set(emails) == {"admin1@example.com", "admin2@example.com"}


# ── list_pending_companies ────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_list_pending_companies_empty(session: AsyncSession):
    assert await list_pending_companies(session) == []


@pytest.mark.asyncio
@patch("src.services.auth.enqueue_email_task")
async def test_list_pending_companies(mock_email, session: AsyncSession):
    mock_email.return_value = "job-id"
    await _register(_company_create("p1@example.com", "Company 1"), session)
    await _register(_company_create("p2@example.com", "Company 2"), session)

    # Active company should not appear
    user = await _register(_company_create("active@example.com", "Active Co"), session)
    res = await session.execute(select(User).where(User.id == user.id))  # pyright: ignore[reportArgumentType]
    res.scalar_one().is_active = True
    await session.commit()

    companies = await list_pending_companies(session)
    assert len(companies) == 2
    emails = {c["user"].email for c in companies}
    assert emails == {"p1@example.com", "p2@example.com"}
    assert all(not c["user"].is_active for c in companies)


# ── approve_company ───────────────────────────────────────────────────────────


@pytest.mark.asyncio
@patch("src.services.admin_companies.enqueue_email_task")
@patch("src.services.admin_companies.generate_signed_contract")
@patch("src.services.admin_companies.get_storage_provider")
async def test_approve_company_success(
    mock_storage, mock_pdf, mock_email, session: AsyncSession
):
    mock_email.return_value = "job-id"
    mock_pdf.return_value = b"%PDF-fake"
    mock_storage.return_value.download_file = AsyncMock(return_value=b"fake-sig-bytes")
    mock_storage.return_value.upload_file = AsyncMock(return_value="contract-key.pdf")

    user = await _register(
        _company_create("approve@example.com", "Approve Co"), session
    )
    assert not user.is_active

    result = await approve_company(user.id, session)
    await session.commit()

    # Approval creates an activation token but does NOT activate the account yet
    assert result["user"].is_active is False
    db_user = (
        await session.execute(select(User).where(User.id == user.id))  # pyright: ignore[reportArgumentType]
    ).scalar_one()
    assert db_user.is_active is False

    # Contract PDF should be persisted to storage
    cp = (
        await session.execute(
            select(CompanyProfile).where(CompanyProfile.user_id == user.id)  # pyright: ignore[reportArgumentType]
        )
    ).scalar_one()
    assert cp.contract_pdf_url == "contract-key.pdf"
    mock_storage.return_value.upload_file.assert_called_once()


@pytest.mark.asyncio
async def test_approve_company_not_found(session: AsyncSession):
    with pytest.raises(CompanyNotFoundError):
        await approve_company(99999, session)


@pytest.mark.asyncio
@patch("src.services.auth.enqueue_email_task")
async def test_approve_company_already_approved(mock_email, session: AsyncSession):
    mock_email.return_value = "job-id"
    user = await _register(
        _company_create("already@example.com", "Already Co"), session
    )
    db_user = (
        await session.execute(select(User).where(User.id == user.id))  # pyright: ignore[reportArgumentType]
    ).scalar_one()
    db_user.is_active = True
    await session.commit()

    with pytest.raises(CompanyNotPendingError):
        await approve_company(user.id, session)


@pytest.mark.asyncio
async def test_approve_company_wrong_role(session: AsyncSession):
    admin = User(
        email="wrongrole@example.com",
        hashed_password=get_password_hash("password"),
        role=UserRole.ADMIN,
        is_active=False,
    )
    session.add(admin)
    await session.commit()

    with pytest.raises(CompanyNotPendingError):
        await approve_company(admin.id, session)


# ── reject_company ────────────────────────────────────────────────────────────


@pytest.mark.asyncio
@patch("src.services.admin_companies.enqueue_email_task")
async def test_reject_company_success(mock_email, session: AsyncSession):
    mock_email.return_value = "job-id"
    user = await _register(_company_create("reject@example.com", "Reject Co"), session)
    user_id = user.id

    cp_res = await session.execute(
        select(CompanyProfile).where(CompanyProfile.user_id == user_id)  # pyright: ignore[reportArgumentType]
    )
    cp_id = cp_res.scalar_one().id

    await reject_company(user_id, session)
    await session.commit()

    assert (
        await session.execute(select(User).where(User.id == user_id))  # pyright: ignore[reportArgumentType]
    ).scalar_one_or_none() is None
    assert (
        await session.execute(
            select(CompanyProfile).where(CompanyProfile.id == cp_id)  # pyright: ignore[reportArgumentType]
        )
    ).scalar_one_or_none() is None


@pytest.mark.asyncio
@patch("src.services.admin_companies.enqueue_email_task")
@patch("src.services.admin_companies.get_storage_provider")
async def test_reject_company_deletes_s3_files(
    mock_storage, mock_email, session: AsyncSession
):
    """S3 files (logo + signature) are deleted when a company is rejected."""
    mock_email.return_value = "job-id"
    mock_storage.return_value.delete_file = AsyncMock(return_value=True)
    user = await _register(
        _company_create("reject2@example.com", "Reject2 Co"), session
    )

    await reject_company(user.id, session)
    await session.commit()

    assert mock_storage.return_value.delete_file.call_count >= 1


@pytest.mark.asyncio
async def test_reject_company_not_found(session: AsyncSession):
    with pytest.raises(CompanyNotFoundError):
        await reject_company(99999, session)


@pytest.mark.asyncio
@patch("src.services.auth.enqueue_email_task")
async def test_reject_company_already_approved(mock_email, session: AsyncSession):
    mock_email.return_value = "job-id"
    user = await _register(
        _company_create("rejectactive@example.com", "Active Co"), session
    )
    db_user = (
        await session.execute(select(User).where(User.id == user.id))  # pyright: ignore[reportArgumentType]
    ).scalar_one()
    db_user.is_active = True
    await session.commit()

    with pytest.raises(CompanyNotPendingError):
        await reject_company(user.id, session)


# ── list_active_companies ─────────────────────────────────────────────────────


@pytest.mark.asyncio
@patch("src.services.auth.enqueue_email_task")
async def test_list_active_companies_empty(mock_email, session: AsyncSession):
    mock_email.return_value = "job-id"
    # Pending company should not appear
    await _register(_company_create("pending@example.com", "Pending Co"), session)
    assert await list_active_companies(session) == []


@pytest.mark.asyncio
@patch("src.services.auth.enqueue_email_task")
async def test_list_active_companies(mock_email, session: AsyncSession):
    mock_email.return_value = "job-id"
    for email, name in [("a@example.com", "A Co"), ("b@example.com", "B Co")]:
        user = await _register(_company_create(email, name), session)
        db_user = (
            await session.execute(select(User).where(User.id == user.id))  # pyright: ignore[reportArgumentType]
        ).scalar_one()
        db_user.is_active = True
    await session.commit()

    companies = await list_active_companies(session)
    assert len(companies) == 2
    emails = {c.user.email for c in companies}
    assert emails == {"a@example.com", "b@example.com"}
    assert all(c.user.is_active for c in companies)


# ── delete_active_company ─────────────────────────────────────────────────────


@pytest.mark.asyncio
@patch("src.services.auth.enqueue_email_task")
@patch("src.services.admin_companies.get_storage_provider")
async def test_delete_active_company_deletes_s3_files(
    mock_storage, mock_email, session: AsyncSession
):
    """S3 files (logo + signature) are deleted when a company is hard-deleted."""
    mock_email.return_value = "job-id"
    mock_storage.return_value.delete_file = AsyncMock(return_value=True)
    user = await _register(
        _company_create("delfiles@example.com", "DelFiles Co"), session
    )
    db_user = (
        await session.execute(select(User).where(User.id == user.id))  # pyright: ignore[reportArgumentType]
    ).scalar_one()
    db_user.is_active = True
    await session.commit()

    await delete_active_company(user.id, session)
    await session.commit()

    assert mock_storage.return_value.delete_file.call_count >= 1


@pytest.mark.asyncio
@patch("src.services.auth.enqueue_email_task")
async def test_delete_active_company_no_jobs(mock_email, session: AsyncSession):
    mock_email.return_value = "job-id"
    user = await _register(_company_create("del@example.com", "Del Co"), session)
    db_user = (
        await session.execute(select(User).where(User.id == user.id))  # pyright: ignore[reportArgumentType]
    ).scalar_one()
    db_user.is_active = True
    await session.commit()
    user_id = user.id

    await delete_active_company(user_id, session)
    await session.commit()

    assert (
        await session.execute(select(User).where(User.id == user_id))  # pyright: ignore[reportArgumentType]
    ).scalar_one_or_none() is None


@pytest.mark.asyncio
@patch("src.services.auth.enqueue_email_task")
async def test_delete_active_company_cascades_jobs_and_applications(
    mock_email, session: AsyncSession
):
    mock_email.return_value = "job-id"
    user = await _register(
        _company_create("cascade@example.com", "Cascade Co"), session
    )
    db_user = (
        await session.execute(select(User).where(User.id == user.id))  # pyright: ignore[reportArgumentType]
    ).scalar_one()
    db_user.is_active = True
    await session.flush()

    cp = (
        await session.execute(
            select(CompanyProfile).where(CompanyProfile.user_id == user.id)  # pyright: ignore[reportArgumentType]
        )
    ).scalar_one()

    job = Job(
        title="Engineer",
        description="Desc",
        requirements="Python",
        location="TLV",
        company_id=cp.id,
    )
    session.add(job)
    await session.flush()

    candidate = CandidateProfile(full_name="Test Candidate", email="cand@example.com")
    session.add(candidate)
    await session.flush()

    app = Application(job_id=job.id, candidate_id=candidate.id)
    session.add(app)
    await session.commit()

    job_id = job.id
    app_id = app.id
    user_id = user.id

    await delete_active_company(user_id, session)
    await session.commit()

    assert (
        await session.execute(select(User).where(User.id == user_id))  # pyright: ignore[reportArgumentType]
    ).scalar_one_or_none() is None
    assert (
        await session.execute(select(Job).where(Job.id == job_id))  # pyright: ignore[reportArgumentType]
    ).scalar_one_or_none() is None
    assert (
        await session.execute(
            select(Application).where(Application.id == app_id)  # pyright: ignore[reportArgumentType]
        )
    ).scalar_one_or_none() is None


@pytest.mark.asyncio
async def test_delete_active_company_not_found(session: AsyncSession):
    with pytest.raises(CompanyNotFoundError):
        await delete_active_company(99999, session)


# ── admin_create_company / get_company_profile / update_company_profile ──────


def _admin_create_payload(name: str = "אדמין-קומפ") -> CompanyProfileAdminCreate:
    return CompanyProfileAdminCreate(
        name=name,
        company_id="123456789",
        address="רח׳ אדמין 1, תל אביב",
        contact_first_name="אורי",
        contact_last_name="אדמין",
        contact_mobile_phone="0509999999",
    )


@pytest.mark.asyncio
async def test_admin_create_company_persists_profile_without_user(
    session: AsyncSession,
):
    profile = await admin_create_company(_admin_create_payload(), session)
    await session.commit()

    assert profile.id is not None
    assert profile.user_id is None
    assert profile.name == "אדמין-קומפ"
    # Round-trip via the DB to make sure user_id is actually NULL on disk.
    result = await session.execute(
        select(CompanyProfile).where(CompanyProfile.id == profile.id)  # pyright: ignore[reportArgumentType]
    )
    persisted = result.scalar_one()
    assert persisted.user_id is None


@pytest.mark.asyncio
async def test_get_company_profile_returns_admin_created_company(
    session: AsyncSession,
):
    created = await admin_create_company(_admin_create_payload(), session)
    await session.commit()
    fetched = await get_company_profile(created.id, session)
    assert fetched.id == created.id
    assert fetched.user_id is None
    assert fetched.name == created.name


@pytest.mark.asyncio
async def test_get_company_profile_not_found(session: AsyncSession):
    with pytest.raises(CompanyNotFoundError):
        await get_company_profile(99999, session)


@pytest.mark.asyncio
async def test_update_company_profile_partial(session: AsyncSession):
    created = await admin_create_company(_admin_create_payload(), session)
    await session.commit()

    updated = await update_company_profile(
        created.id,
        CompanyProfileAdminUpdate(name="שם חדש", contact_landline_phone="03-1234567"),
        session,
    )
    await session.commit()

    assert updated.name == "שם חדש"
    assert updated.contact_landline_phone == "03-1234567"
    # Untouched fields preserved
    assert updated.company_id == created.company_id
    assert updated.contact_mobile_phone == created.contact_mobile_phone


@pytest.mark.asyncio
async def test_update_company_profile_not_found(session: AsyncSession):
    with pytest.raises(CompanyNotFoundError):
        await update_company_profile(
            99999, CompanyProfileAdminUpdate(name="anything"), session
        )
