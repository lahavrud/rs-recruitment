"""Unit tests for Redis-backed invite token management."""

from unittest.mock import AsyncMock, patch

import pytest

from src.core.infrastructure.invite_tokens import (
    TOKEN_TTL_SECONDS,
    _key,
    consume_invite_token,
    generate_invite_token,
    validate_invite_token,
)
from src.core.infrastructure.security import hash_token
from src.services.exceptions import InvalidInviteTokenError


@pytest.fixture()
def mock_redis():
    """Patch get_redis_pool at its definition site (src.core.tasks)."""
    redis = AsyncMock()
    with patch(
        "src.core.tasks.get_redis_pool",
        new_callable=AsyncMock,
        return_value=redis,
    ):
        yield redis


class TestKeyHelper:
    def test_key_prefixes_token(self):
        assert _key("abc123") == "invite_token:abc123"

    def test_key_different_tokens_produce_different_keys(self):
        assert _key("aaa") != _key("bbb")


class TestGenerateInviteToken:
    @pytest.mark.asyncio
    async def test_returns_raw_token_hash_and_expiry(self, mock_redis):
        raw, token_hash, expires_at = await generate_invite_token()
        assert isinstance(raw, str) and len(raw) > 0
        assert token_hash == hash_token(raw)
        assert expires_at is not None

    @pytest.mark.asyncio
    async def test_stores_hash_in_redis_with_ttl(self, mock_redis):
        raw, token_hash, _ = await generate_invite_token()
        mock_redis.set.assert_called_once_with(
            _key(token_hash), "1", ex=TOKEN_TTL_SECONDS
        )

    @pytest.mark.asyncio
    async def test_each_call_generates_unique_raw_token(self, mock_redis):
        raw_a, _, _ = await generate_invite_token()
        raw_b, _, _ = await generate_invite_token()
        assert raw_a != raw_b


class TestValidateInviteToken:
    @pytest.mark.asyncio
    async def test_does_not_raise_when_token_exists(self, mock_redis):
        mock_redis.get.return_value = b"1"
        await validate_invite_token("valid-token")  # should not raise

    @pytest.mark.asyncio
    async def test_raises_when_token_missing(self, mock_redis):
        mock_redis.get.return_value = None
        with pytest.raises(InvalidInviteTokenError):
            await validate_invite_token("nonexistent-token")

    @pytest.mark.asyncio
    async def test_looks_up_hash_of_submitted_token(self, mock_redis):
        mock_redis.get.return_value = b"1"
        await validate_invite_token("my-token")
        mock_redis.get.assert_called_once_with(_key(hash_token("my-token")))


class TestConsumeInviteToken:
    @pytest.mark.asyncio
    async def test_deletes_hash_from_redis(self, mock_redis):
        await consume_invite_token("used-token")
        mock_redis.delete.assert_called_once_with(_key(hash_token("used-token")))

    @pytest.mark.asyncio
    async def test_swallows_exceptions_silently(self):
        broken_redis = AsyncMock()
        broken_redis.delete.side_effect = Exception("Redis connection lost")
        with patch(
            "src.core.tasks.get_redis_pool",
            new_callable=AsyncMock,
            return_value=broken_redis,
        ):
            await consume_invite_token("some-token")  # must not raise
