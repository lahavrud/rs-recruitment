"""Pydantic schemas for request/response validation."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr

from src.models import UserRole


# Registration Schemas
class CompanyProfileCreate(BaseModel):
    """Schema for creating a company profile."""

    name: str
    logo_url: str | None = None
    contact_person: str | None = None
    contact_phone: str | None = None


class UserCreate(BaseModel):
    """Schema for creating a user (registration)."""

    email: EmailStr
    password: str
    company_profile: CompanyProfileCreate


class UserRead(BaseModel):
    """Schema for reading user data (excludes sensitive fields)."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    role: UserRole
    is_active: bool
    created_at: datetime


class CompanyProfileRead(BaseModel):
    """Schema for reading company profile data."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    name: str
    logo_url: str | None
    contact_person: str | None
    contact_phone: str | None
    created_at: datetime


class UserWithCompanyRead(BaseModel):
    """Schema for user with company profile."""

    user: UserRead
    company_profile: CompanyProfileRead


# Login Schemas
class LoginRequest(BaseModel):
    """Schema for login request."""

    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    """Schema for token response."""

    access_token: str
    token_type: str = "bearer"
