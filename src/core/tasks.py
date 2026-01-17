"""Arq task definitions for async background job processing."""

import logging
from typing import List, Optional

from arq import ArqRedis, create_pool
from arq.connections import RedisSettings

from src.core.infrastructure.config import settings
from src.core.services.email import get_email_provider

logger = logging.getLogger(__name__)

# Global Redis pool (initialized on worker startup)
_redis_pool: Optional[ArqRedis] = None


async def send_email_task(
    ctx: dict,
    to: str | List[str],
    subject: str,
    body: str,
    from_email: Optional[str] = None,
) -> bool:
    """
    Async task to send an email.

    This task is enqueued by the application and processed by Arq workers.
    It handles retries automatically on failure.

    Args:
        ctx: Arq context (contains job metadata)
        to: Recipient email address(es)
        subject: Email subject
        body: Email body (plain text)
        from_email: Sender email address (optional)

    Returns:
        True if sent successfully, False otherwise
    """
    logger.info(f"Sending email to {to} with subject: {subject}")

    try:
        provider = get_email_provider()
        success = await provider.send_email(
            to=to,
            subject=subject,
            body=body,
            from_email=from_email,
        )

        if success:
            logger.info(f"Email sent successfully to {to}")
        else:
            logger.warning(f"Failed to send email to {to}")
            # Raise exception to trigger retry
            raise Exception(f"Email provider returned False for {to}")

        return success
    except Exception as e:
        logger.error(f"Error sending email to {to}: {e}", exc_info=True)
        # Re-raise to trigger Arq retry mechanism
        raise


class WorkerSettings:
    """Arq worker configuration."""

    redis_settings = RedisSettings.from_dsn(settings.redis_url)
    functions = [send_email_task]
    # Retry configuration
    max_jobs = 10  # Maximum concurrent jobs
    job_timeout = 300  # 5 minutes timeout per job
    # Retry failed tasks up to 3 times with exponential backoff
    retry_jobs = True
    max_tries = 3
    # Keep job results for 1 hour
    keep_result = 3600


async def get_redis_pool() -> ArqRedis:
    """
    Get or create Redis connection pool for Arq.

    The pool is created lazily on first use (not during application startup).
    This allows the application to start even if Redis is temporarily unavailable.

    Returns:
        ArqRedis connection pool instance

    Raises:
        ConnectionError: If unable to connect to Redis
    """
    global _redis_pool

    if _redis_pool is None:
        try:
            redis_settings = RedisSettings.from_dsn(settings.redis_url)
            _redis_pool = await create_pool(redis_settings)
            logger.info(f"Created Redis connection pool: {settings.redis_url}")
        except Exception as e:
            logger.error(
                f"Failed to connect to Redis at {settings.redis_url}: {e}. "
                "Make sure Redis is running and REDIS_URL is configured correctly."
            )
            raise

    return _redis_pool


async def close_redis_pool() -> None:
    """Close Redis connection pool (call on application shutdown)."""
    global _redis_pool

    if _redis_pool is not None:
        await _redis_pool.close()
        _redis_pool = None
        logger.info("Closed Redis connection pool")


async def enqueue_email_task(
    to: str | List[str],
    subject: str,
    body: str,
    from_email: Optional[str] = None,
) -> Optional[str]:
    """
    Enqueue an email task for async processing.

    This is the main function to use from application code to send emails
    asynchronously. The email will be processed by Arq workers.

    Args:
        to: Recipient email address(es)
        subject: Email subject
        body: Email body (plain text)
        from_email: Sender email address (optional)

    Returns:
        Job ID if enqueued successfully, None if failed

    Example:
        ```python
        job_id = await enqueue_email_task(
            to="user@example.com",
            subject="Welcome!",
            body="Thank you for registering."
        )
        ```
    """
    try:
        pool = await get_redis_pool()
        job = await pool.enqueue_job(
            "send_email_task",
            to=to,
            subject=subject,
            body=body,
            from_email=from_email,
        )
        logger.info(f"Enqueued email task {job.job_id} for {to}")
        return job.job_id
    except Exception as e:
        logger.error(f"Failed to enqueue email task: {e}", exc_info=True)
        return None
