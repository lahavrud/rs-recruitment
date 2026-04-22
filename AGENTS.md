# AGENTS.md

## Stack
**Backend:** Python 3.12 / FastAPI / SQLModel (async) / Alembic / PostgreSQL (prod) / SQLite (dev+test) / Arq+Redis / uv
**Frontend:** React 19 / TypeScript / Vite 8 / Tailwind CSS v4 / React Router v7 / Axios / npm

## Setup
```bash
uv sync
pre-commit install
export JWT_SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")
```
`JWT_SECRET_KEY` (≥32 chars) is **required at startup** — app will fail without it. All other settings have defaults (SQLite DB, local storage, SMTP email). Supports `.env` file via pydantic-settings.

## Commands
```bash
# Server & worker
uv run uvicorn src.main:app --reload
uv run arq src.core.tasks.WorkerSettings       # requires Redis

# Migrations
uv run alembic upgrade head
uv run alembic downgrade -1
uv run alembic revision --autogenerate -m "description"

# Seed first admin user
PYTHONPATH=. uv run python scripts/seed_admin.py <email> <password>

# Tests
uv run pytest -n auto                                      # all tests, parallel (matches CI)
uv run pytest tests/api/test_auth.py                       # single file
uv run pytest tests/api/test_auth.py::test_login_success   # single test
uv run pytest -xvs                                         # stop on first failure, verbose

# Lint & format
uv run ruff check .
uv run ruff check --fix .
uv run ruff format .
uv run ruff format --check .                               # CI mode (no writes)
```

## Frontend commands
```bash
# Run from frontend/ directory
npm run dev                # Dev server on http://localhost:3000 (proxies to backend :8000)
npm run build              # TypeScript check + production build
npm run lint               # ESLint
npm run format             # Prettier (auto-fix)
npm run format:check       # Prettier (check only, CI mode)
```

## CI checks — run locally before pushing
Run from repo root (`PYTHONPATH=.` is set automatically in CI; prefix manually when running scripts directly):

```bash
python scripts/validate_imports.py      # services/ and core/ must not import fastapi or HTTPException
python scripts/check_file_sizes.py      # src/api/ <200 lines, src/services/ and src/core/ <300 lines (non-empty)
python scripts/validate_type_hints.py   # every public function in src/ must have an explicit return type
python scripts/validate_blocking_io.py  # no blocking I/O inside async def (see Hard Rules below)
python scripts/validate_test_files.py   # every src/api/X.py, src/services/X.py, src/core/infrastructure/X.py
                                        # must have a corresponding tests/*/test_X.py
```
CI runs `lint` → `test` → `docker-build` in that order. All must pass before merge.

## Architecture
```
src/
├── main.py              # FastAPI app, router registration, lifespan, CORS
├── models.py            # All SQLModel table definitions
├── schemas.py           # All Pydantic request/response schemas
├── enums.py             # UserRole, JobStatus, ApplicationStatus
├── api/                 # Thin FastAPI routers — no business logic
├── services/            # Business logic — no FastAPI imports
│   └── exceptions.py    # Domain exception types (raised by services, caught by routers)
└── core/
    ├── tasks.py         # Arq task definitions + enqueue_email_task()
    ├── infrastructure/  # DB engine, config, security, dependencies, error_handling, limiter
    └── services/        # storage.py (local/S3), email.py (SMTP/SES)
tests/                   # Mirrors src/ structure exactly
frontend/
├── src/
│   ├── components/      # Reusable UI (layout/AppLayout, Header, Sidebar)
│   ├── pages/           # Route-level pages (LoginPage, DashboardPage, NotFoundPage)
│   ├── services/        # api.ts (Axios client), auth.ts (login/logout)
│   ├── contexts/        # AuthContext (React Context for auth state)
│   ├── hooks/           # useAuth (convenience hook)
│   ├── types/           # TypeScript types mirroring backend schemas/enums
│   └── utils/           # token.ts (localStorage helpers)
├── vite.config.ts       # Vite config (Tailwind, proxy, path aliases)
└── package.json
```
Authoritative references: `docs/ARCHITECTURE.md`, `docs/CONTEXT.md`

## Hard rules (CI-enforced)

**Import separation**
- `src/services/` must NOT import `fastapi` or `HTTPException` — raise domain exceptions from `src/services/exceptions.py` instead; routers catch and convert them.
- `src/core/infrastructure/` must NOT import `fastapi` — exceptions: `dependencies.py` and `error_handling.py`.

**No blocking I/O inside `async def`** — forbidden patterns the CI script checks:
- `open()` → use `aiofiles.open()`
- `time.sleep()` → use `asyncio.sleep()`
- `requests.*` → use `httpx.AsyncClient`
- `session.query()` → use `await session.execute()`
- `Path.read_bytes/write_bytes/read_text/write_text/exists/unlink/mkdir()` → use `aiofiles` or `loop.run_in_executor()`

**Return type annotations** — every public (non-`_`-prefixed, non-`__init__`) function in `src/` must have an explicit return type.

**Test file coverage** — adding `src/api/foo.py`, `src/services/foo.py`, or `src/core/infrastructure/foo.py` without a matching `tests/*/test_foo.py` will fail CI.

**File size limits** (non-empty lines) — `src/api/` <200, `src/services/` <300, `src/core/` <300.

## Domain rules

- **Admin as Gatekeeper** — companies, jobs, and applications require explicit admin approval. Never auto-approve public input.
- **Hybrid Auth** — `User` (roles: `ADMIN`, `COMPANY`) is authenticated via JWT. `CandidateProfile` is an unauthenticated lead. Do NOT add JWT auth for candidates unless explicitly requested.
- **New tables/enums** — ask the user before adding any. Do not introduce them silently.
- **Auth logic** lives only in `src/core/infrastructure/security.py`.
- **Storage** always via `src/core/services/storage.py` — never access the filesystem directly.
- **Email** always via `src/core/tasks.py::enqueue_email_task()` — never call SMTP/SES directly.
- Do NOT introduce microservices, generic repository patterns, or abstraction layers beyond what exists.
- Do NOT add tables or enums outside the current domain: `User`, `CompanyProfile`, `Job`, `CandidateProfile`, `Application`, `UserRole`, `JobStatus`, `ApplicationStatus`.

## Testing quirks

- `uv run pytest -n auto` uses `pytest-xdist` — DB is a **SQLite temp file** (not in-memory) for worker compatibility.
- FK constraints are enforced via `enable_sqlite_foreign_keys()` in `tests/conftest.py` — test behavior matches PostgreSQL.
- Three client fixtures (see `tests/conftest.py`): `public_client`, `company_client`, `admin_client`. Auth is via FastAPI `dependency_overrides`, not real JWT tokens.
- `enqueue_email_task` is always patched — no Redis needed to run tests.
- `asyncio_mode = "auto"` in `pyproject.toml` — do not add `@pytest.mark.asyncio` to test functions.
- `PYTHONPATH=.` must be set when running `scripts/` outside of pytest (CI sets it automatically).

## GitHub CLI defaults

An AI agent performing GitHub actions should always use the following flags without asking.

### `gh issue create`
```bash
gh issue create \
  --assignee "@me" \
  --project "RS Recruitment - MVP" \
  --label "<type>,<priority>,<scope>" \
  --milestone "<milestone>"
```
**Labels** — always include one from each category:
- Type: `feat` | `fix` | `chore` | `docs` | `test` | `refactor` | `security`
- Priority: `P1` | `P2` | `P3` (always required)
- Scope: `backend` | `frontend` | `api` | `infra` | `config` | `ci`
- Example: `--label "feat,P2,backend"`

**Milestones** (current — may be updated): `Infrastructure Phase` | `Company Slice` | `Job Slice` | `Candidate Slice` | `Match Slice` | `Frontend` | `Deployment`

**Body** — use `.github/ISSUE_TEMPLATE/task.md` structure:
```
## 🎯 Goal
## 📐 Scope (in / out of scope)
## 🧩 Tasks (checklist)
## ✅ Definition of Done
```

### `gh pr create`
```bash
gh pr create \
  --assignee "@me" \
  --base main \
  --title "feat(scope): description" \
  --body "$(cat <<'EOF'
## Summary

## Why

## Changes
-

## How to Test

## Related Issue
Closes #<N>
EOF
)"
```
- Title must follow Conventional Commits format.
- Body **must** contain `Closes #N` (not "Related to") — this triggers `.github/workflows/assign-milestone.yml` to auto-assign the milestone from the linked issue.

## Git conventions
- **Conventional Commits** enforced by pre-commit on `commit-msg`: `feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert(scope): description`
- **Branch naming**: `feat/short-description`, `fix/`, `chore/`, `docs/`, `refactor/`
- **Merge**: squash merge to `main` only. `main` is branch-protected — CI must pass, PR required, no direct pushes, no force-push.
- Keep branches short-lived (hours to 1 day).
