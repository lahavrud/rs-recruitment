from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum

from sqlalchemy import Text
from sqlmodel import Column, Field, Relationship, SQLModel


class UserRole(str, Enum):
    """User role enumeration."""

    ADMIN = "ADMIN"
    COMPANY = "COMPANY"


class JobStatus(str, Enum):
    """Job status enumeration."""

    PENDING_APPROVAL = "PENDING_APPROVAL"
    PUBLISHED = "PUBLISHED"
    CLOSED = "CLOSED"


class ApplicationStatus(str, Enum):
    """Application (Match) status enumeration."""

    NEW = "NEW"
    APPROVED_BY_ADMIN = "APPROVED_BY_ADMIN"
    REJECTED = "REJECTED"
    HIRED = "HIRED"


class User(SQLModel, table=True):
    """Authenticated user entity (Admins & Companies).

    Users authenticate and log in. Candidates do NOT use this model.
    """

    id: int | None = Field(default=None, primary_key=True)
    email: str = Field(unique=True, index=True)
    hashed_password: str
    role: UserRole
    is_active: bool = Field(default=False, description="False until Admin approves")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    # Relationship to CompanyProfile (optional, only for COMPANY role)
    # Note: ADMIN users don't have CompanyProfile, so this can be None
    # Reverted to original - CompanyProfile is defined later,
    # but SQLModel handles forward references
    company_profile: CompanyProfile = Relationship(
        back_populates="user",
        sa_relationship_kwargs={"uselist": False},
    )


class CompanyProfile(SQLModel, table=True):
    """Company profile linked to a User.

    One-to-one relationship with User (for COMPANY role users).
    """

    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", unique=True, index=True)
    name: str
    logo_url: str | None = None
    contact_person: str | None = None
    contact_phone: str | None = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    # Relationship to User
    user: User = Relationship(back_populates="company_profile")


class Job(SQLModel, table=True):
    """Job posting linked to a CompanyProfile.

    Jobs can be posted by companies and require admin approval before being published.
    """

    id: int | None = Field(default=None, primary_key=True)
    company_id: int = Field(foreign_key="companyprofile.id", index=True)
    title: str
    description: str
    requirements: str
    location: str
    status: JobStatus = Field(default=JobStatus.PENDING_APPROVAL)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    # Relationship to CompanyProfile
    company: CompanyProfile = Relationship(back_populates="jobs")
    # Relationship to Applications
    applications: list["Application"] = Relationship(back_populates="job")


class CandidateProfile(SQLModel, table=True):
    """Candidate profile (unauthenticated lead).

    Candidates do not authenticate. They are treated as leads/data entities.
    """

    id: int | None = Field(default=None, primary_key=True)
    full_name: str
    email: str = Field(unique=True, index=True)
    phone: str | None = None
    resume_path: str | None = None
    linkedin_url: str | None = None

    # Interview Form Fields (Subject to Change)
    service_concept: str | None = Field(default=None, sa_column=Column(Text))
    salary_expectations: str | None = Field(default=None, sa_column=Column(Text))
    military_service_details: str | None = Field(default=None, sa_column=Column(Text))
    transportation: str | None = Field(default=None, sa_column=Column(Text))
    personality_weakness: str | None = Field(default=None, sa_column=Column(Text))
    personality_strength: str | None = Field(default=None, sa_column=Column(Text))

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    # Relationship to Applications
    applications: list["Application"] = Relationship(back_populates="candidate")


class Application(SQLModel, table=True):
    """Application (Match) - the core business entity.

    Links a Candidate to a Job. Represents the recruitment match.
    """

    id: int | None = Field(default=None, primary_key=True)
    job_id: int = Field(foreign_key="job.id", index=True)
    candidate_id: int = Field(foreign_key="candidateprofile.id", index=True)
    status: ApplicationStatus = Field(default=ApplicationStatus.NEW)
    admin_notes: str | None = Field(default=None, sa_column=Column(Text))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    # Relationships
    job: Job = Relationship(back_populates="applications")
    candidate: CandidateProfile = Relationship(back_populates="applications")
