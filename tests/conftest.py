"""Shared pytest fixtures for all tests."""

import os

import pytest

from src.core.config import settings


@pytest.fixture(scope="session", autouse=True)
def setup_testing_environment():
    """Set up testing environment before all tests."""
    # Enable testing mode (disables rate limiting and config validation)
    settings.testing = True
    # Ensure JWT_SECRET_KEY is set for tests
    os.environ.setdefault(
        "JWT_SECRET_KEY", "test_secret_key_min_32_chars_long_for_testing"
    )
    yield
    # Cleanup
    settings.testing = False
    os.environ.pop("TESTING", None)


@pytest.fixture
def mock_s3_bucket():
    """Fixture providing mock S3 bucket configuration.

    Can be reused across multiple test files.
    """
    return {
        "bucket_name": "test-bucket",
        "region": "us-east-1",
    }
