"""Redis-backed invite token management for gated company registration."""

import logging
import secrets
from datetime import datetime, timedelta, timezone

from src.core.infrastructure.security import hash_token
from src.services.exceptions import InvalidInviteTokenError

_logger = logging.getLogger(__name__)

# 2-hour window is enough for an admin to send the link and the company to
# register; a shorter TTL reduces the reuse window if Redis fails to delete
# the token after a successful registration.
TOKEN_TTL_SECONDS = 2 * 60 * 60  # 2 hours
_KEY_PREFIX = "invite_token:"


def _key(token_hash: str) -> str:
    return f"{_KEY_PREFIX}{token_hash}"


async def generate_invite_token() -> tuple[str, str, datetime]:
    """Generate a cryptographically secure token, store in Redis.

    Returns (raw_token, token_hash, expires_at). Only the hash is stored in
    the DB and used as the Redis key; the raw token is sent in the email link.
    """
    from src.core.tasks import (
        get_redis_pool,  # local import to avoid circular at load time
    )

    raw = secrets.token_urlsafe(32)
    token_hash = hash_token(raw)
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=TOKEN_TTL_SECONDS)
    redis = await get_redis_pool()
    await redis.set(_key(token_hash), "1", ex=TOKEN_TTL_SECONDS)
    return raw, token_hash, expires_at


async def validate_invite_token(token: str) -> None:
    """Raise InvalidInviteTokenError if the token does not exist or has expired.

    token is the raw value from the URL; it is hashed before the Redis lookup.
    """
    from src.core.tasks import get_redis_pool

    redis = await get_redis_pool()
    value = await redis.get(_key(hash_token(token)))
    if value is None:
        raise InvalidInviteTokenError("Invite token is invalid or has expired")


async def consume_invite_token(token: str) -> None:
    """Delete the token from Redis after successful registration (best-effort).

    token is the raw value from the URL.
    Deletion failure is logged loudly so an operator can manually revoke
    the token.  The TTL acts as the last-resort safety net.
    """
    try:
        from src.core.tasks import get_redis_pool

        redis = await get_redis_pool()
        await redis.delete(_key(hash_token(token)))
    except Exception:
        # Registration is already committed.  Log at WARNING so this is
        # visible in alerting — an operator should manually verify the token
        # is no longer usable before it expires.
        _logger.warning(
            "invite_token_consume_failed: token could not be deleted from Redis; "
            "it will expire via TTL in %d seconds. token_prefix=%s",
            TOKEN_TTL_SECONDS,
            token[:8],
        )


async def revoke_invite_token(token_hash: str) -> None:
    """Delete the token from Redis (best-effort; token may already be expired).

    token_hash is the SHA-256 digest stored in the DB, used directly as the
    Redis key — no re-hashing needed.
    """
    try:
        from src.core.tasks import get_redis_pool

        redis = await get_redis_pool()
        await redis.delete(_key(token_hash))
    except Exception:
        _logger.warning(
            "invite_token_revoke_failed: token could not be deleted from Redis; "
            "it will expire via TTL in %d seconds. token_hash_prefix=%s",
            TOKEN_TTL_SECONDS,
            token_hash[:8],
        )
