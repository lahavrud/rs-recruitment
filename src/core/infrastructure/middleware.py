"""FastAPI middleware: request correlation IDs and APM latency logging."""

import logging
import time
import uuid
from contextvars import ContextVar

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

request_id_var: ContextVar[str] = ContextVar("request_id", default="")

logger = logging.getLogger(__name__)


class RequestIdFilter(logging.Filter):
    """Inject the current request_id into every LogRecord emitted in this context.

    Install once on the root logger so every logger in the process picks it up.
    When called outside a request context the field is an empty string.
    """

    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = request_id_var.get("")  # type: ignore[attr-defined]
        return True


class RequestMiddleware(BaseHTTPMiddleware):
    """Per-request correlation ID + APM latency in a single middleware pass.

    Sets a UUID for every request, threads it through all log lines via
    ContextVar, returns it in the X-Request-ID response header, and logs
    method / path / status / duration_ms on response so CloudWatch Logs
    Insights can compute p95/p99 per endpoint without a separate APM agent.
    """

    async def dispatch(self, request: Request, call_next: object) -> Response:
        rid = str(uuid.uuid4())
        request_id_var.set(rid)

        t0 = time.perf_counter()
        response: Response = await call_next(request)  # type: ignore[operator]
        duration_ms = round((time.perf_counter() - t0) * 1000)

        response.headers["X-Request-ID"] = rid

        logger.info(
            "request",
            extra={
                "request_id": rid,
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "duration_ms": duration_ms,
            },
        )

        return response
