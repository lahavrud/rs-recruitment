# 🗺️ Product Roadmap: RS Recruitment (MVP)

**Vision:** A specialized CRM for a boutique recruitment agency.  
**Core Value:** Streamlining the flow from "Lead" (Job/Candidate) to "Match", with the Admin as the central gatekeeper.

---

## 🧭 Principles

- **Vertical Slices:** Develop features end-to-end (DB → Business Logic → API → Tests).  
- **Admin as Gatekeeper:** All public data (Companies, Jobs, Matches) require Admin approval.  
- **Hybrid Auth:** Admins & Companies are authenticated Users; Candidates are unauthenticated leads.  
- **Trunk-Based Development:** Docs/Chores → direct Main; Features → short-lived branches merged quickly.  
- **Backend-First Approach:** Complete backend API MVP before building frontend. Frontend consumes stable, tested APIs.  
- **DevOps / Agile Deploy:**  
  - CI/CD ensures every push is tested and containerized.  
  - Deployment environments (Dev/Staging/Production) **after structured MVP completion**.  
  - Focus on feature completion before infrastructure complexity.  
- **Low Friction MVP:** Minimal auth surface, minimal public access, focus on working vertical slices.
- **Architecture-First Decisions:** Critical infrastructure decisions (file storage, email, frontend architecture, backups) must be made before dependent features.

---

## Development Timeline (Vertical Slices + DevOps)

**⚠️ Critical Dependencies:**
- `feat5` (Candidate Slice) **requires** `infra6` (File Storage Strategy) - Resume uploads need persistent storage
- `frontend1` (Frontend Setup) **requires** `infra7` (Frontend Architecture Decision) + `infra8` (CORS Configuration) - Must decide SSR vs SPA and configure CORS for SPA
- `feat8` (Notifications) **requires** `infra5` (Email Service) - Email service must be integrated
- `deploy1` (Production) **requires** `devops1` (Database Backup Strategy) - Backup strategy must be defined

```mermaid
gantt
    title RS Recruitment MVP Roadmap
    dateFormat  YYYY-MM-DD
    axisFormat  %d/%m

    section 🏗️ 0. Infrastructure
    Repo, Docker & CI Setup         :done,    infra1, 2026-01-01, 3d
    Architecture & Planning         :done,    infra2, after infra1, 2d
    AI Context & Governance         :done,    infra3, after infra2, 1d
    CI/CD Pipeline (Linter/Test)    :done,    infra4, after infra3, 1d
    Email Service (SMTP/SendGrid)   :done,    infra5, after infra4, 2d
    File Storage Strategy (S3/MinIO):done,    infra6, after infra5, 2d
    Frontend Architecture Decision  :done,    infra7, after infra6, 1d
    CORS Configuration (Backend)    :done,    infra8, after infra7, 1d

    section 🏢 1. Company Slice
    Company Onboarding (Auth + DB)  :done,    feat1,  after infra4, 5d
    Admin Approval Flow             :done,    feat2,  2026-01-18, 2d

    section 💼 2. Job Slice
    Job Posting (CRUD)              :done,    feat3,  2026-01-20, 2d
    Public Job Board                :done,    feat4,  2026-01-22, 1d

    section 👤 3. Candidate Slice
    Public Application Form         :         feat5,  2026-01-23, 2d
    Shadow Profile Logic            :         feat6,  2026-01-25, 1d

    section 🤝 4. Match Slice
    Admin Dashboard                 :         feat7,  2026-01-26, 2d
    Notifications Integration       :         feat8,  2026-01-28, 1d

    section 🎨 5. Frontend
    Frontend Structure & Setup      :         frontend1, 2026-01-29, 1d
    Public Pages (Job Board/Apply)  :         frontend2, 2026-01-30, 2d
    Admin & Company Dashboards      :         frontend3, 2026-02-01, 2d

    section 🚀 Deployment
    Database Backup Strategy        :crit,    devops1, 2026-02-03, 1d
    Dev Environment Deploy          :         devops2, 2026-02-04, 1d
    Staging Deploy                  :         devops3, 2026-02-05, 1d
    Production Deploy               :         deploy1, 2026-02-06, 1d
