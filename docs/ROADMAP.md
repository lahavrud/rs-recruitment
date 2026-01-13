# 🗺️ Product Roadmap: RS Recruitment

**Vision:** A specialized CRM for a boutique recruitment agency.
**Core Value:** Streamlining the flow from "Lead" (Job/Candidate) to "Match", with the Admin as the central gatekeeper.

## Development Timeline (Vertical Slices)

```mermaid
gantt
    title Recruitment System MVP Roadmap
    dateFormat  YYYY-MM-DD
    axisFormat  %W
    
    section 🏗️ 0. Infrastructure
    Repo, Docker & CI Setup       :done,    infra1, 2026-01-01, 3d
    Architecture & Planning       :active,  infra2, after infra1, 2d
    AI Context & Governance       :         infra3, after infra2, 1d

    section 🏢 1. Company Slice
    Company Onboarding (Auth + DB) :         feat1, after infra3, 5d
    Admin Approval Flow           :         feat2, after feat1, 3d

    section 💼 2. Job Slice
    Job Posting (CRUD)            :         feat3, after feat2, 4d
    Public Job Board (Read-Only)  :         feat4, after feat3, 3d

    section 👤 3. Candidate Slice
    Public Application Form       :         feat5, after feat4, 5d
    Shadow Profile Logic          :         feat6, after feat5, 3d

    section 🤝 4. Match Slice
    Admin Dashboard (The Link)    :         feat7, after feat6, 5d
    Notifications logic           :         feat8, after feat7, 3d