"""Rate limiting configuration."""

from slowapi import Limiter
from slowapi.util import get_remote_address

from src.core.infrastructure.config import settings


def get_limiter() -> Limiter:
    """Get rate limiter instance.

    Automatically disables rate limiting when settings.testing=True.
    """
    return Limiter(
        key_func=get_remote_address,
        enabled=not settings.testing,
    )
