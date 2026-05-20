# 🧠 AI Context & Coding Standards

**Project:** RS Recruitment – Boutique Recruitment Agency CRM

**Architecture:** Modular Monolith, Vertical Slices

**Primary Goal:** Ship a clean, maintainable MVP

---

## 1. Core Philosophy

* **Vertical Slices**: Build features end-to-end (DB → business logic → API). Do NOT build by technical layers.
* **Admin as Gatekeeper**: Companies, Jobs, and Matches require Admin approval. Public input is never auto-trusted.
* **Hybrid Auth Model**:
* Admins, Companies, and Candidates are authenticated `Users`.
* Anonymous applicants exist as bare `CandidateProfile` rows (no linked `User`); they are upgraded to a candidate `User` by registering or by claiming their submission via the public apply form (Sprint 11 — see issues #604–#619 for the candidate-user feature surface).
* Candidate auth lifecycle (issue #605): `POST /api/auth/candidate/register` → `is_active=False` user + 2-hour `ActivationToken` (consent policy version snapshotted on the token) → user clicks email link → `POST /api/activate` flips `is_active=True`, creates / links the `CandidateProfile`, and writes consent fields using the activation request's IP/UA → login via the standard `/api/auth/login`. Unactivated candidates can request a new link via `POST /api/auth/candidate/resend-activation` (silent 202; Redis-backed per-email rate limit). Re-registering with the same email while `is_active=False` updates the password and replaces the token. Login for `is_active=False` users returns the existing `401 account_pending_activation` regardless of role.

* **MVP First**: Prefer simple, explicit solutions over abstractions. Avoid over-engineering and premature optimization.

---

## 2. Coding Standards

* **Language & Typing**:
* Python 3.12+.
* Strict type hints required (validated via CI).
* Prefer explicit return types.

* **Dependency Management**:
* **`uv`** is the primary tool for dependency management and execution.
* Use `uv sync` for environment setup and `uv run` for executing scripts and tests.

* **Project Structure**:
* `src/models.py`: All SQLModel database tables.
* `src/enums.py`: All enumeration types.
* `src/schemas.py`: All Pydantic schemas for request/response validation.
* `src/api/`: Thin routers, split by domain.
* `src/services/`: Domain-specific business logic (HTTP-agnostic).
* `src/core/infrastructure/`: Pure infrastructure (config, database, security).

* **Business Logic & Service Layer**:
* Services raise domain exceptions from `services/exceptions.py`.
* Routers convert domain exceptions to HTTP responses.
* Services accept `AsyncSession` as a parameter (dependency injection).

* **Testing**:
* `pytest` must pass before merging.
* Parallel execution via `uv run pytest -n auto`.

* **Async Database Rules**:
* ALWAYS use `await session.execute(...)` or `await session.get(...)`.
* NEVER use blocking I/O inside async functions (validated via CI).

* **Custom CI Validations**:
* All code must pass automated scripts for: SOC enforcement, Async safety, Type hints, and Test file existence.

---

## 3. Domain Model (Source of Truth)

* **User**: Authenticated entity (Roles: `ADMIN`, `COMPANY`, `CANDIDATE`).
* **CompanyProfile**: 1:1 with User today; `user_id` will become nullable to support admin-posted jobs against companies that have no user yet.
* **CandidateProfile**: Either an anonymous lead (no `user_id`, created by the public apply form) or a registered candidate (linked 1:1 with a `User(role=CANDIDATE)`). FK to `user` uses `ON DELETE SET NULL` so deleting a candidate User leaves the profile in place for application history; the deletion service PII-scrubs the profile in place (see Sprint 11 / #611). One profile per email (UNIQUE), many `Application` rows per profile.
* **Job**: Linked to Company (Status: `PENDING_APPROVAL` → `PUBLISHED` → `CLOSED`).
* **Application**: Links Candidate ↔ Job (Status: `NEW` → `APPROVED_BY_ADMIN` → `REJECTED` → `HIRED` → `WITHDRAWN`). Carries `admin_notes` (internal) and `resume_path` (per-application snapshot). Unique on `(job_id, candidate_id)` is **partial** — `WHERE status != 'WITHDRAWN'` — so candidates can re-apply to a job they previously withdrew from.

---

## 4. Git & GitHub Workflow

* **Commit Messages**: Always use **Conventional Commits** (e.g., `feat(auth): add login`).
* **Trunk-Based Development**: Short-lived branches merged via PR to `main`.
* **CI/CD Expectations**:
* Code must pass `lint`, `test`, and `docker-build` jobs before merge.
* Fix failing CI before adding new features.

---

## 5. Environment Notes

* **Local Stack**: PostgreSQL (Database), Redis (Task Queue), and FastAPI API.
* **Database**: PostgreSQL for both Local Development and Production to ensure dialect parity.
* **Async Tasks**: `Arq` with `Redis` handles background jobs like emails.
* **Storage**: Abstraction layer supports Local Storage (Dev) and AWS S3 (Prod).

---

## 6. Immediate Goal

Focus exclusively on the **current active vertical slice**. Deliver working functionality over theoretical completeness.
