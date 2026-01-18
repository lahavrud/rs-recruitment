"""Tests for Pydantic schemas validation."""

import pytest
from pydantic import ValidationError

from src.schemas import CandidateProfileCreate, CandidateProfileUpdate


@pytest.mark.parametrize(
    "schema_class,create_kwargs,expected_path",
    [
        (
            CandidateProfileCreate,
            {
                "full_name": "Test User",
                "email": "test@example.com",
                "resume_path": "uploads/resumes/test_resume.pdf",
            },
            "uploads/resumes/test_resume.pdf",
        ),
        (
            CandidateProfileUpdate,
            {"resume_path": "uploads/resumes/updated_resume.pdf"},
            "uploads/resumes/updated_resume.pdf",
        ),
    ],
)
def test_valid_resume_path(schema_class, create_kwargs, expected_path):
    """Test that valid paths within uploads/resumes/ are accepted."""
    schema = schema_class(**create_kwargs)
    assert schema.resume_path == expected_path


@pytest.mark.parametrize(
    "schema_class,create_kwargs",
    [
        (
            CandidateProfileCreate,
            {
                "full_name": "Test User",
                "email": "test@example.com",
                "resume_path": None,
            },
        ),
        (CandidateProfileUpdate, {"resume_path": None}),
    ],
)
def test_none_resume_path(schema_class, create_kwargs):
    """Test that None is allowed for optional resume_path field."""
    schema = schema_class(**create_kwargs)
    assert schema.resume_path is None


@pytest.mark.parametrize(
    "schema_class,create_kwargs",
    [
        (
            CandidateProfileCreate,
            {
                "full_name": "Malicious User",
                "email": "malicious@example.com",
                "resume_path": "../../../../etc/passwd",
            },
        ),
        (CandidateProfileUpdate, {"resume_path": "../../../../etc/passwd"}),
    ],
)
def test_path_traversal_parent_directory(schema_class, create_kwargs):
    """Test that paths with '..' are rejected (path traversal attack)."""
    with pytest.raises(ValidationError, match="Path cannot contain '..'"):
        schema_class(**create_kwargs)


@pytest.mark.parametrize(
    "schema_class,create_kwargs",
    [
        (
            CandidateProfileCreate,
            {
                "full_name": "Malicious User",
                "email": "malicious@example.com",
                "resume_path": "../config.py",
            },
        ),
        (CandidateProfileUpdate, {"resume_path": "../config.py"}),
    ],
)
def test_path_traversal_relative_parent(schema_class, create_kwargs):
    """Test that relative parent paths are rejected."""
    with pytest.raises(ValidationError, match="Path cannot contain '..'"):
        schema_class(**create_kwargs)


@pytest.mark.parametrize(
    "schema_class,create_kwargs",
    [
        (
            CandidateProfileCreate,
            {
                "full_name": "Malicious User",
                "email": "malicious@example.com",
                "resume_path": "/root/sensitive_file",
            },
        ),
        (CandidateProfileUpdate, {"resume_path": "/root/sensitive_file"}),
    ],
)
def test_absolute_path_rejected(schema_class, create_kwargs):
    """Test that absolute paths are rejected."""
    with pytest.raises(ValidationError, match="Path cannot be absolute"):
        schema_class(**create_kwargs)


@pytest.mark.parametrize(
    "schema_class,create_kwargs",
    [
        (
            CandidateProfileCreate,
            {
                "full_name": "Malicious User",
                "email": "malicious@example.com",
                "resume_path": "config/secrets.env",
            },
        ),
        (CandidateProfileUpdate, {"resume_path": "config/secrets.env"}),
    ],
)
def test_path_outside_uploads_directory(schema_class, create_kwargs):
    """Test that paths outside uploads/resumes/ are rejected."""
    error_msg = "Path must be within 'uploads/resumes/'"
    with pytest.raises(ValidationError, match=error_msg):
        schema_class(**create_kwargs)


@pytest.mark.parametrize(
    "schema_class,create_kwargs,expected_path",
    [
        (
            CandidateProfileCreate,
            {
                "full_name": "Test User",
                "email": "test@example.com",
                "resume_path": "uploads/resumes/2026/01/resume.pdf",
            },
            "uploads/resumes/2026/01/resume.pdf",
        ),
        (
            CandidateProfileUpdate,
            {"resume_path": "uploads/resumes/2026/01/updated.pdf"},
            "uploads/resumes/2026/01/updated.pdf",
        ),
    ],
)
def test_nested_valid_path(schema_class, create_kwargs, expected_path):
    """Test that nested paths within uploads/resumes/ are accepted."""
    schema = schema_class(**create_kwargs)
    assert schema.resume_path == expected_path
