# 🗺️ Product Roadmap: RS Recruitment (MVP)

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

## Development Timeline (Vertical Slices + DevOps)

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

    section 🏢 1. Company Slice
    Company Onboarding (Auth + DB)  :active,  feat1,  after infra4, 5d
    Dev Environment Deploy          :         devops1, after feat1, 2d
    Admin Approval Flow             :         feat2,  after devops1, 3d

    section 💼 2. Job Slice
    Job Posting (CRUD)              :         feat3,  after feat2, 4d
    Public Job Board                :         feat4,  after feat3, 3d
    Staging Deploy                  :         devops2, after feat4, 2d

    section 👤 3. Candidate Slice
    Public Application Form         :         feat5,  after devops2, 5d
    Shadow Profile Logic            :         feat6,  after feat5, 3d

    section 🤝 4. Match Slice
    Admin Dashboard                 :         feat7,  after feat6, 5d
    Notifications                   :         feat8,  after feat7, 3d

    section 🚀 Production
    Production Deploy               :         deploy1, after feat8, 2d
