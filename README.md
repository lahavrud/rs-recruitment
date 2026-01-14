# RS Recruitment

![CI](https://github.com/lahavrud/rs-recruitment/actions/workflows/ci.yml/badge.svg)

**Vision:** A specialized CRM for a boutique recruitment agency.  
**Core Value:** Streamlining the flow from "Lead" (Job/Candidate) to "Match", with the Admin as the central gatekeeper.

---

## 🧭 Principles

- **Vertical Slices:** Develop features end-to-end (DB → Business Logic → API → Tests).  
- **Admin as Gatekeeper:** All public data (Companies, Jobs, Matches) require Admin approval.  
- **Hybrid Auth:** Admins & Companies are authenticated Users; Candidates are unauthenticated leads.  
- **Trunk-Based Development:** Docs/Chores → direct Main; Features → short-lived branches merged quickly.  
- **DevOps / Agile Deploy:**  
  - CI/CD ensures every push is tested and containerized.  
  - Dev Environment deploy **after first working slice**.  
  - Staging deploy **after multiple slices** for integration validation.  
  - Production deploy **after full MVP**.  
- **Low Friction MVP:** Minimal auth surface, minimal public access, focus on working vertical slices.

---

## Tech Stack

- **Python 3.12** - Core programming language
- **FastAPI** - Modern, fast web framework for building APIs
- **Pydantic** - Data validation using Python type annotations
- **Uvicorn** - ASGI server for running FastAPI applications
- **SQLModel** - Database ORM (SQLAlchemy + Pydantic)
- **Ruff** - Fast Python linter and code formatter
- **Docker** - Containerization for deployment

---

## Architecture

This project follows a **Modular Monolith** architecture with a **Vertical Slices** approach:

- **Vertical Slices**: Features are developed end-to-end (database → business logic → API), not by technical layers. Each feature is a complete vertical slice through the application stack.
- **Admin Gatekeeper**: Companies, Jobs, and Matches require Admin approval. Public input is never auto-trusted, ensuring data quality and security.

The system uses a hybrid authentication model where Admins and Companies are authenticated Users, while Candidates are unauthenticated leads (CandidateProfiles). This approach reduces complexity while maintaining flexibility for future enhancements.

---

## Documentation

Detailed documentation is available in the [`docs/`](docs/) directory:

- **[CONTEXT.md](docs/CONTEXT.md)** - Project context, coding standards, and domain model
- **[ARCHITECTURE.md](docs/ARCHITECTURE.md)** - System architecture, authentication model, and database schema
- **[ROADMAP.md](docs/ROADMAP.md)** - Product roadmap and development timeline
- **[API_DESIGN.md](docs/API_DESIGN.md)** - API design specifications

---

## Local Development

### Prerequisites

- Python 3.12+
- pip (Python package installer)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/lahavrud/rs-recruitment.git
   cd rs-recruitment
   ```

2. Create and activate a virtual environment (recommended):
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Set up environment variables (optional, defaults are provided):
   ```bash
   # Set variables directly:
   export JWT_SECRET_KEY="your-secret-key-change-in-production"
   export DATABASE_URL="sqlite+aiosqlite:///./data/rs_recruitment.db"
   ```
   
   Or create a `.env` file in the project root with:
   ```bash
   JWT_SECRET_KEY=your-secret-key-change-in-production
   DATABASE_URL=sqlite+aiosqlite:///./data/rs_recruitment.db
   ```

5. Run database migrations:
   ```bash
   alembic upgrade head
   ```

6. (Optional) Seed an admin user:
   ```bash
   python scripts/seed_admin.py admin@example.com your-secure-password
   ```

### Running Locally (Without Docker)

After installation, run the development server:

```bash
# Make sure virtual environment is activated
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Run the FastAPI application
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at:
- **API**: `http://localhost:8000`
- **Interactive API Docs (Swagger)**: `http://localhost:8000/docs`
- **Alternative API Docs (ReDoc)**: `http://localhost:8000/redoc`
- **Health Check**: `http://localhost:8000/health`

### Running with Docker

#### Using Docker Compose (Recommended)

```bash
# Start the API
docker-compose up

# Or run in detached mode (background)
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the API
docker-compose down
```

#### Using Docker directly

```bash
# Build the image
docker build -t rs-recruitment .

# Run the container
docker run -p 8000:8000 rs-recruitment

# Or with environment variables
docker run -p 8000:8000 \
  -e JWT_SECRET_KEY="your-production-secret-key" \
  rs-recruitment
```

The API will be available at `http://localhost:8000`.

**Environment Variables:**
- `JWT_SECRET_KEY` - Secret key for JWT token signing (default: "your-secret-key-change-in-production")
- `JWT_ALGORITHM` - JWT algorithm (default: "HS256")
- `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` - Token expiration in minutes (default: 30)
- `DATABASE_URL` - Database connection string (default: `sqlite+aiosqlite:///./data/rs_recruitment.db` for both local and Docker)

---

## Testing

Run the test suite:

```bash
# Run all tests
pytest

# Run with verbose output
pytest -v

# Run specific test file
pytest tests/test_auth.py
```

---

## Database Migrations

Manage database schema changes with Alembic:

```bash
# Create a new migration
alembic revision --autogenerate -m "description of changes"

# Apply migrations
alembic upgrade head

# Rollback last migration
alembic downgrade -1

# View migration history
alembic history
```

---

## API Endpoints

Current available endpoints:

**Authentication:**
- `POST /auth/register` - Register a new company user
- `POST /auth/login` - Login and receive JWT token

**System:**
- `GET /health` - Health check endpoint
- `GET /docs` - Interactive API documentation (Swagger UI)
- `GET /redoc` - Alternative API documentation (ReDoc)

---

## Code Quality

Run the linter to check code quality:
```bash
ruff check .
```

For automated formatting:
```bash
ruff format .
```

---

## Seeding Admin User

To create an admin user for testing:

```bash
python scripts/seed_admin.py <email> <password>
```

Example:
```bash
python scripts/seed_admin.py admin@example.com securepassword123
```
