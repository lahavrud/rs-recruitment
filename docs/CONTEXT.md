# 🧠 AI Context & Coding Standards

**Project:** RS Recruitment – Boutique Recruitment Agency CRM

**Architecture:** Modular Monolith, Vertical Slices

**Primary Goal:** Ship a clean, maintainable MVP

---

## 1. Core Philosophy

* **Vertical Slices**: Build features end-to-end (DB → business logic → API). Do NOT build by technical layers.
* **Admin as Gatekeeper**: Companies, Jobs, and Matches require Admin approval. Public input is never auto-trusted.
* **Hybrid Auth Model**:
* Admins & Companies are authenticated `Users`.
* Candidates are unauthenticated `CandidateProfile` leads in MVP.
* Candidate authentication is **planned post-MVP** as an optional "claim" flow (match-by-email links past applications to a new account). Schema must keep this path open: nullable `user_id` on `CandidateProfile`, unique `email`. Do NOT add Candidate authentication endpoints in MVP unless explicitly requested.

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

* **User**: Authenticated entity (Roles: `ADMIN`, `COMPANY`).
* **CompanyProfile**: 1:1 with User today; `user_id` will become nullable to support admin-posted jobs against companies that have no user yet.
* **CandidateProfile**: Unauthenticated lead containing interview-related fields. One profile per email (planned constraint), many `Application` rows per profile.
* **Job**: Linked to Company (Status: `PENDING_APPROVAL` → `PUBLISHED` → `CLOSED`).
* **Application**: Links Candidate ↔ Job (Status: `NEW` → `APPROVED_BY_ADMIN` → `REJECTED` → `HIRED`). Carries `admin_notes` (internal). Resume is per-application snapshot; the candidate profile holds the latest.

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
