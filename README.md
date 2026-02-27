# RS Recruitment

**Vision:** A specialized CRM for a boutique recruitment agency.

**Core Value:** Streamlining the flow from "Lead" (Job/Candidate) to "Match", with the Admin as the central gatekeeper.

---

## 🧭 Principles

* **Vertical Slices:** Features are developed end-to-end (DB → Business Logic → API → Tests).
* **Admin as Gatekeeper:** All public data (Companies, Jobs, Matches) require Admin approval.
* **Hybrid Auth:** Admins & Companies are authenticated Users; Candidates are unauthenticated leads.
* **Trunk-Based Development:** Docs/Chores → direct Main; Features → short-lived branches merged quickly.
* **DevOps / Agile Deploy:**
  - CI/CD ensures every push is tested and containerized.
  - Dev Environment deploy after first working slice.
  - Staging deploy after multiple slices for integration validation.
  - Production deploy after full MVP.
* **Low Friction MVP:** Minimal auth surface, minimal public access, focus on working vertical slices.

---

## 🛠 Tech Stack

* **Python 3.12**: Core programming language.
* **FastAPI**: Modern, high-performance web framework.
* **SQLModel**: Database ORM (SQLAlchemy + Pydantic).
* **PostgreSQL & asyncpg**: Production-ready relational database with asynchronous drivers.
* **Alembic**: Database migration management.
* **Redis & Arq**: In-memory broker and async task queue for reliable background processing (e.g., emails).
* **AWS (S3 & SES)**: Cloud infrastructure for secure file storage and transactional email delivery.
* **uv**: Fast Python package installer and resolver used for dependency management and CI speed.
* **Ruff**: Ultra-fast Python linter and code formatter.
* **Docker & Docker Compose**: Containerization for consistent development and deployment.
* **Pytest & HTTPX**: Comprehensive unit and integration testing.
* **JWT (python-jose)**: Secure, stateless authentication and authorization.

---

## 🏗 Architecture

This project follows a **Modular Monolith** architecture with a **Vertical Slices** approach.

* **Service Layer Pattern**: Business logic is decoupled from API routers into dedicated services (e.g., `src/services/auth.py`) to improve testability and maintainability.
* **Storage Abstraction**: A provider-based system supporting Local, S3, and MinIO storage without code changes.
* **Async Task Queue**: Long-running operations like email notifications are offloaded to background workers using Arq and Redis.

---

## 📂 Documentation

* **[ARCHITECTURE.md](docs/ARCHITECTURE.md)**: System design, authentication models, and ERDs.
* **[CONTEXT.md](docs/CONTEXT.md)**: Coding standards, domain models, and SOC enforcement rules.
* **[ROADMAP.md](docs/ROADMAP.md)**: Development phases and feature timeline.

---

## 🚀 Local Development

### Prerequisites

* **Python 3.12+**
* **uv** (Recommended)
* **Docker & Docker Compose**

### Quick Start

1. **Clone and Install**:
```bash
git clone https://github.com/lahavrud/rs-recruitment.git
cd rs-recruitment
uv sync  # Automatically creates venv and installs dependencies

```


2. **Environment Setup**:
```bash
# Mandatory for security validation
export JWT_SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")

```


3. **Launch Services**:
```bash
docker-compose up -d

```


4. **Initialize Database**:
```bash
uv run alembic upgrade head

```



### Running Services Manually

If you prefer running the API locally for hot-reloading:

* **API**: `uv run uvicorn src.main:app --reload`
* **Worker**: `uv run arq src.core.tasks.WorkerSettings`

---

## 🧪 Testing & Quality

### Automated Validations

The CI pipeline and pre-commit hooks enforce strict quality standards:

* **SOC Enforcement**: Prevents invalid import patterns across layers.
* **Async Safety**: Detects blocking I/O calls inside `async` functions.
* **Type Safety**: Enforces type hints on public functions.
* **Test Coverage**: Validates that test files exist for all source components.

### Running Tests

```bash
uv run pytest -n auto  # Parallel execution
