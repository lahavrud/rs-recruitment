"""Shared pytest fixtures for all tests."""

import os
from collections.abc import AsyncGenerator

import pytest
from sqlalchemy import event
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlmodel import SQLModel

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


# Use in-memory SQLite for tests
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

# Create test engine and session factory
test_engine = create_async_engine(TEST_DATABASE_URL, echo=False, future=True)
# Enable FK constraints for SQLite to match PostgreSQL behavior
enable_sqlite_foreign_keys(test_engine)
TestSessionLocal = async_sessionmaker(
    test_engine, class_=AsyncSession, expire_on_commit=False
)


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


@pytest.fixture(scope="function")
async def test_db() -> AsyncGenerator[None, None]:
    """Create and drop test database tables for each test."""
    async with test_engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.drop_all)


@pytest.fixture
async def session(test_db) -> AsyncGenerator[AsyncSession, None]:
    """Create a test database session."""
    async with TestSessionLocal() as session:
        yield session


@pytest.fixture
def mock_s3_bucket():
    """Fixture providing mock S3 bucket configuration.

    Can be reused across multiple test files.
    """
    return {
        "bucket_name": "test-bucket",
        "region": "us-east-1",
    }
