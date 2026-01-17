"""Shared pytest fixtures for all tests."""

import os

import pytest
from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncEngine

from src.core.infrastructure.config import settings


def enable_sqlite_foreign_keys(engine: AsyncEngine) -> None:
    """Enable foreign key constraint enforcement for SQLite.

    This function should be called after creating a SQLite async engine to ensure
    foreign key constraints are enforced during tests, matching PostgreSQL
    behavior in production.

    Args:
        engine: SQLAlchemy AsyncEngine instance
    """

    @event.listens_for(engine.sync_engine, "connect")
    def _set_sqlite_pragma(dbapi_connection, connection_record):
        """Execute PRAGMA foreign_keys=ON for each connection."""
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


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
