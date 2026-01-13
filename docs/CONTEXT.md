# 🧠 AI Context & Coding Standards

**Project:** RS Recruitment – Boutique Recruitment Agency CRM  
**Architecture:** Modular Monolith, Vertical Slices  
**Primary Goal:** Ship a clean, maintainable MVP

---

## 1. Core Philosophy

- **Vertical Slices**
  Build features end-to-end (DB → business logic → API).
  Do NOT build by technical layers.

- **Admin as Gatekeeper**
  Companies, Jobs, and Matches require Admin approval.
  Public input is never auto-trusted.

- **Hybrid Auth Model**
  - Admins & Companies are authenticated `Users`
  - Candidates are unauthenticated `CandidateProfile` leads
  - Do NOT add Candidate authentication unless explicitly requested

- **MVP First**
  Prefer simple, explicit solutions over abstractions.
  Avoid over-engineering and premature optimization.

---

## 2. Coding Standards

- **Language & Typing**
  - Python 3.11+
  - Strict type hints required
  - Prefer explicit return types

- **Project Structure**
  - `src/models.py` – All SQLModel database tables
  - `src/api/` – API routers, split by domain (vertical slice)
  - `src/main.py` – FastAPI app entry point

- **Business Logic**
  - Keep logic close to the domain
  - Avoid “fat routers”
  - No generic service layers unless necessary

- **Docstrings**
  - Use Google-style docstrings
  - Only for non-trivial logic

- **Testing**
  - `pytest` must pass before merging
  - Prefer simple unit tests over complex mocks

---

## 3. Domain Model (Source of Truth)

This summary reflects the authoritative domain model.
If there is a conflict, defer to `ARCHITECTURE.md`.

- **User**
  Authenticated entity  
  Roles: `ADMIN`, `COMPANY`

- **CompanyProfile**
  1:1 with User

- **CandidateProfile**
  Unauthenticated lead  
  Contains interview-related fields

- **Job**
  Linked to Company  
  Status: `PENDING_APPROVAL` → `PUBLISHED` → `CLOSED`

- **Application**
  Core business entity (Match)  
  Links Candidate ↔ Job  
  Status: `NEW` → `APPROVED_BY_ADMIN` → `REJECTED` → `HIRED`

---

## 4. What NOT To Do (Unless Explicitly Requested)

- Do NOT add Candidate authentication
- Do NOT introduce microservices
- Do NOT create generic abstraction layers
- Do NOT add tables or enums not defined in the domain
- Do NOT optimize for scale prematurely

---

## 5. Environment Notes

- SQLite is used for local development only
- Database engine may change without impacting domain logic

---

## 6. Immediate Goal

Focus exclusively on the **current active vertical slice**.
Deliver working functionality over theoretical completeness.
