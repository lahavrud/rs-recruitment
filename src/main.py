from contextlib import asynccontextmanager

from fastapi import FastAPI

from src.api import auth
from src.core.database import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup/shutdown events."""
    # Initialize database on startup
    await init_db()
    yield


app = FastAPI(title="RS Recruitment API", lifespan=lifespan)

# Include routers
app.include_router(auth.router)


@app.get("/health")
def health_check():
    return {"status": "ok"}
