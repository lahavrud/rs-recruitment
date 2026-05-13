"""Sentry tunnel — forwards browser error envelopes to Sentry's ingest API.

The browser Sentry SDK sends envelopes to *.ingest.sentry.io directly, which
ad-blockers and strict CSPs routinely block (status: null CORS failure).
This endpoint acts as a same-origin relay so envelopes reach Sentry even when
the browser can't make the cross-origin request itself.

Security:
- Validates that the envelope's DSN matches FRONTEND_SENTRY_DSN (prevents
  using this endpoint as an open proxy for arbitrary Sentry projects).
- Rate-limited to 60 req/min per IP to limit abuse surface.
- Errors in this handler are logged but never forwarded to Sentry (avoids
  infinite loop if Sentry itself is the source of the failure).
"""

import json
import logging
from urllib.parse import urlparse

import httpx
from fastapi import APIRouter, HTTPException, Request, Response, status

from src.core.infrastructure.config import settings
from src.core.infrastructure.limiter import limiter

router = APIRouter(tags=["monitoring"])

_logger = logging.getLogger(__name__)

_TUNNEL_RATE = "60/minute"
_SENTRY_TIMEOUT = 8.0  # seconds


def _extract_dsn(body: bytes) -> str | None:
    """Return the DSN from the envelope header line, or None on parse failure."""
    try:
        header_line = body.split(b"\n", 1)[0]
        header = json.loads(header_line)
        return header.get("dsn") or None
    except (ValueError, KeyError):
        return None


def _sentry_ingest_url(dsn: str) -> str | None:
    """Derive the Sentry ingest URL from a DSN, or None if the DSN is malformed."""
    try:
        parsed = urlparse(dsn)
        host = parsed.hostname or ""
        if not host.endswith(".sentry.io"):
            return None
        project_id = parsed.path.strip("/")
        if not project_id.isdigit():
            return None
        return f"https://{host}/api/{project_id}/envelope/"
    except Exception:
        return None


@router.post("/api/sentry-tunnel", status_code=status.HTTP_200_OK)
@limiter.limit(_TUNNEL_RATE)
async def sentry_tunnel(request: Request) -> Response:
    """Relay a Sentry envelope from the browser to Sentry's ingest endpoint."""
    if not settings.frontend_sentry_dsn:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Sentry tunnel not configured",
        )

    body = await request.body()
    if not body:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST)

    dsn = _extract_dsn(body)
    if not dsn or dsn != settings.frontend_sentry_dsn:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid DSN",
        )

    ingest_url = _sentry_ingest_url(dsn)
    if not ingest_url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Malformed DSN",
        )

    try:
        async with httpx.AsyncClient(timeout=_SENTRY_TIMEOUT) as client:
            resp = await client.post(
                ingest_url,
                content=body,
                headers={"Content-Type": "application/x-sentry-envelope"},
            )
    except httpx.RequestError as exc:
        _logger.warning("Sentry tunnel: upstream request failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Sentry unreachable",
        )

    return Response(content=resp.content, status_code=resp.status_code)
