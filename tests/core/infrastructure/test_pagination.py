"""Unit tests for the cursor-pagination helpers."""

from datetime import datetime, timezone

import pytest

from src.core.infrastructure.pagination import (
    DEFAULT_LIMIT,
    MAX_LIMIT,
    CursorPage,
    build_cursor_page,
    clamp_limit,
    decode_cursor,
    encode_cursor,
)
from src.services.exceptions import InvalidCursorError


class _Row:
    def __init__(self, row_id: int, created_at: datetime):
        self.id = row_id
        self.created_at = created_at


def test_cursor_round_trip():
    ts = datetime(2026, 5, 7, 12, 34, 56, tzinfo=timezone.utc)
    cursor = encode_cursor(ts, 42)
    assert isinstance(cursor, str)
    assert "=" not in cursor  # padding stripped
    decoded_ts, decoded_id = decode_cursor(cursor)
    assert decoded_ts == ts
    assert decoded_id == 42


def test_decode_cursor_rejects_garbage():
    with pytest.raises(InvalidCursorError):
        decode_cursor("not-a-real-cursor")


def test_decode_cursor_rejects_truncated_payload():
    with pytest.raises(InvalidCursorError):
        decode_cursor(encode_cursor(datetime.now(timezone.utc), 1)[:5])


def test_clamp_limit_defaults_when_none():
    assert clamp_limit(None) == DEFAULT_LIMIT


def test_clamp_limit_floors_below_one():
    assert clamp_limit(0) == 1
    assert clamp_limit(-5) == 1


def test_clamp_limit_caps_at_max():
    assert clamp_limit(MAX_LIMIT + 50) == MAX_LIMIT


def test_clamp_limit_passes_through_valid():
    assert clamp_limit(25) == 25


def test_build_cursor_page_no_more_when_under_limit():
    rows = [_Row(1, datetime(2026, 1, 1, tzinfo=timezone.utc))]
    page: CursorPage[int] = build_cursor_page(
        rows,
        serializer=lambda r: r.id,
        sort_attr="created_at",
        id_attr="id",
        limit=10,
    )
    assert page.items == [1]
    assert page.next_cursor is None


def test_build_cursor_page_emits_cursor_when_more_available():
    base = datetime(2026, 1, 1, tzinfo=timezone.utc)
    rows = [_Row(i, base) for i in range(11)]  # limit + 1
    page: CursorPage[int] = build_cursor_page(
        rows,
        serializer=lambda r: r.id,
        sort_attr="created_at",
        id_attr="id",
        limit=10,
    )
    assert len(page.items) == 10
    assert page.items == list(range(10))
    assert page.next_cursor is not None
    decoded_ts, decoded_id = decode_cursor(page.next_cursor)
    # Boundary points at the last row of the emitted page (id=9).
    assert decoded_id == 9
    assert decoded_ts == base
