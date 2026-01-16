from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded

from src.api import auth
from src.core.config import settings, validate_settings
from src.core.database import init_db
from src.core.limiter import get_limiter


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup/shutdown events."""
    # Validate critical settings
    validate_settings()
    # Initialize database on startup
    await init_db()
    yield


app = FastAPI(title="RS Recruitment API", lifespan=lifespan)

# Configure rate limiting
app.state.limiter = get_limiter()


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    """Handle rate limit exceeded exceptions."""
    detail = getattr(exc, "detail", "Rate limit exceeded")
    return JSONResponse(
        status_code=429,
        content={"detail": f"{detail}. Please try again later."},
    )


# Configure CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

# Include routers
app.include_router(auth.router)


@app.get("/health")
def health_check():
    return {"status": "ok"}
