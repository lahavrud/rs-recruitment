"""Cursor-based pagination helpers for admin list endpoints.

Forward-only keyset pagination on `(created_at desc, id desc)`. The cursor is an
opaque base64 string encoding the boundary row's `(created_at, id)`; the next
page contains rows strictly older than that boundary.
"""

from __future__ import annotations

import base64
import binascii
from datetime import datetime
from typing import Any, Callable, Generic, TypeVar

from pydantic import BaseModel
from sqlalchemy import Select, and_, or_
from sqlalchemy.orm import InstrumentedAttribute

from src.services.exceptions import InvalidCursorError

M = TypeVar("M")
R = TypeVar("R")

DEFAULT_LIMIT = 20
MAX_LIMIT = 100
_CURSOR_SEP = "|"


class CursorPage(BaseModel, Generic[M]):
    """A single page of items with an opaque cursor for the next page."""

    items: list[M]
    next_cursor: str | None = None


def encode_cursor(created_at: datetime, row_id: int) -> str:
    """Encode `(created_at, id)` as an opaque url-safe base64 string."""
    raw = f"{created_at.isoformat()}{_CURSOR_SEP}{row_id}".encode()
    return base64.urlsafe_b64encode(raw).decode().rstrip("=")


def decode_cursor(cursor: str) -> tuple[datetime, int]:
    """Decode a cursor back to `(created_at, id)`.

    Raises:
        InvalidCursorError: If the cursor is malformed or unparseable.
    """
    try:
        padded = cursor + "=" * (-len(cursor) % 4)
        raw = base64.urlsafe_b64decode(padded.encode()).decode()
        ts_str, id_str = raw.split(_CURSOR_SEP, 1)
        return datetime.fromisoformat(ts_str), int(id_str)
    except (binascii.Error, UnicodeDecodeError, ValueError) as exc:
        raise InvalidCursorError("Invalid pagination cursor") from exc


def clamp_limit(limit: int | None) -> int:
    """Clamp the user-supplied `limit` to `[1, MAX_LIMIT]`; default `DEFAULT_LIMIT`."""
    if limit is None:
        return DEFAULT_LIMIT
    if limit < 1:
        return 1
    if limit > MAX_LIMIT:
        return MAX_LIMIT
    return limit


def apply_cursor(
    query: Select[Any],
    *,
    sort_col: InstrumentedAttribute[Any],
    id_col: InstrumentedAttribute[Any],
    cursor: str | None,
    limit: int,
) -> Select[Any]:
    """Add keyset filter, descending order, and `limit + 1` to a select.

    The query is sorted by `sort_col DESC, id_col DESC`. When `cursor` is set,
    only rows strictly older than the boundary row are returned. Selecting one
    extra row lets the caller detect whether another page exists.
    """
    if cursor is not None:
        boundary_ts, boundary_id = decode_cursor(cursor)
        query = query.where(
            or_(
                sort_col < boundary_ts,
                and_(sort_col == boundary_ts, id_col < boundary_id),
            )
        )
    return query.order_by(sort_col.desc(), id_col.desc()).limit(limit + 1)


def build_cursor_page(
    rows: list[R],
    *,
    serializer: Callable[[R], M],
    sort_attr: str,
    id_attr: str,
    limit: int,
) -> CursorPage[M]:
    """Slice up to `limit` rows from a `limit+1` fetch and emit the next cursor."""
    has_more = len(rows) > limit
    page_rows = rows[:limit]
    next_cursor: str | None = None
    if has_more and page_rows:
        last = page_rows[-1]
        next_cursor = encode_cursor(
            getattr(last, sort_attr),
            getattr(last, id_attr),
        )
    return CursorPage(
        items=[serializer(r) for r in page_rows],
        next_cursor=next_cursor,
    )
