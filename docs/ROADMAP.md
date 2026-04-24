# 🗺️ Product Roadmap: RS Recruitment (MVP)

**Vision:** A specialized CRM for a boutique recruitment agency.

**Core Value:** Streamlining the flow from "Lead" (Job/Candidate) to "Match", with the Admin as the central gatekeeper.

---

## 🧭 Principles

* **Vertical Slices:** Develop features end-to-end (DB → Business Logic → API → Tests).
* **Admin as Gatekeeper:** All public data (Companies, Jobs, Matches) require Admin approval.
* **Hybrid Auth:** Admins & Companies are authenticated Users; Candidates are unauthenticated leads.
* **Backend-First Approach:** Complete backend API MVP before building frontend. Frontend consumes stable, tested APIs.
* **Architecture-First Decisions:** Critical infrastructure decisions (file storage, email, backups) must be made before dependent features.

---

## Development Timeline (Vertical Slices + DevOps)

**⚠️ Critical Dependencies:**

* `feat8` (Notifications) **requires** `infra5` (Email Service Integration).
* `frontend1` (Frontend Setup) **requires** `infra8` (CORS Configuration).
* `deploy1` (Production) **requires** `devops1` (Database Backup Strategy).

```mermaid
gantt
    title RS Recruitment MVP Roadmap
    dateFormat  YYYY-MM-DD
    axisFormat  %d/%m

    section 🏗️ 0. Infrastructure
    Repo, Docker & CI Setup           :done,    infra1, 2026-01-01, 3d
    Architecture & Planning           :done,    infra2, after infra1, 2d
    Email Service (SES/SMTP)          :done,    infra5, 2026-01-06, 2d
    File Storage Strategy (S3/Local)  :done,    infra6, after infra5, 2d
    CORS & SPA Architecture Decision  :done,    infra7, after infra6, 2d
    Local DB Parity (PostgreSQL)      :active,  infra9, 2026-02-27, 2d

    section 🏢 1. Company Slice
    Company Onboarding (Auth + DB)    :done,    feat1, 2026-01-12, 5d
    Admin Approval Flow               :done,    feat2, after feat1, 2d

    section 💼 2. Job Slice
    Job Posting (CRUD)                :done,    feat3, 2026-01-20, 2d
    Public Job Board (Read API)       :done,    feat4, after feat3, 2d

    section 👤 3. Candidate Slice
    Public Application (Submit API)   :done,    feat5, 2026-01-24, 2d
    Shadow Profile Logic              :done,    feat6, after feat5, 1d

    section 🤝 4. Match Slice
    Admin Dashboard (Match Management):active,  feat7, 2026-02-28, 3d
    Notifications Integration         :         feat8, after feat7, 2d

    section 🎨 5. Frontend
    Frontend Structure (SPA Setup)    :         frontend1, 2026-03-05, 2d
    Public Pages (Job Board/Apply)    :         frontend2, after frontend1, 3d
    Admin & Company Dashboards        :         frontend3, after frontend2, 4d

    section 🚀 Deployment
    Database Backup Strategy          :         devops1, 2026-03-15, 2d
    Production Deploy                 :         deploy1, after devops1, 1d

```

---

## Status Summary

### ✅ Completed

* **Infrastructure Abstraction**: Storage and Email providers are fully implemented with local and cloud support.
* **Core Vertical Slices**: Backend APIs for Authentication, Company Registration, Job Management, and Candidate Applications are complete and tested.
* **CI/CD & Validation**: Pipeline includes Ruff linting, Pytest, and custom scripts for Async safety and SOC enforcement.

### 🔄 In Progress

* **Local DB Parity (`infra9`)**: Transitioning local development from SQLite to PostgreSQL via `asyncpg` to ensure 1:1 environment parity.
* **Match Management (`feat7`)**: Refining Admin endpoints for managing the link between Candidates and Jobs.

### 📋 Next Priorities

1. **Notifications Integration (`feat8`)**: Triggering automated emails via the `Arq` task queue when candidates apply or jobs are posted.
2. **Frontend Setup (`frontend1`)**: Initializing the separate SPA architecture following the established CORS configuration.
3. **Backup Strategy (`devops1`)**: Implementing automated PostgreSQL backups, a critical blocker for production deployment.
