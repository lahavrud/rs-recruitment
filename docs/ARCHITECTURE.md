## Design Principles

- **Monolith First** – single deployable service with clear domain boundaries
- **Vertical Slices** – features are developed end-to-end
- **Admin as Gatekeeper** – all public data requires admin approval
- **Match is the Product** – the Application entity is the system core
- **Low friction MVP** – minimal auth surface, minimal public access
- **Future-ready** – decisions documented, refactors anticipated

---

## Authentication Model

### Hybrid Auth Model

- **Users** authenticate and log in
    - Admins
    - Companies
- **Candidates** do NOT authenticate
    - They are treated as leads / data entities
    - Future authentication is optional and non-breaking

This model reduces security risk and complexity while keeping the system flexible.

---

## Database Schema (ERD)

```mermaid
erDiagram
    User ||--o| CompanyProfile : owns
    CompanyProfile ||--o{ Job : posts
    Job ||--o{ Application : receives
    CandidateProfile ||--o{ Application : submits

    %% Auth System (Admins & Companies)
    User {
        int id
        string email
        string hashed_password
        enum role "ADMIN, COMPANY"
        bool is_active "False until Admin approves"
        datetime created_at
    }

    %% Company Data
    CompanyProfile {
        int id
        int user_id "FK to User"
        string name
        string logo_url
        string contact_person
        string contact_phone
        datetime created_at
    }

    %% Job Inventory
    Job {
        int id
        int company_id
        string title
        string description
        string requirements
        string location
        enum status "PENDING_APPROVAL, PUBLISHED, CLOSED"
        datetime created_at
    }

    %% Candidate Lead (No Authentication)
    CandidateProfile {
        int id
        string full_name
        string email
        string phone
        string resume_path
        string linkedin_url

        %% Interview Form (Subject to Change)
        text service_concept
        text salary_expectations
        text military_service_details
        text transportation
        text personality_weakness
        text personality_strength

        datetime created_at
    }

    %% Match (Core Business Entity)
    Application {
        int id
        int job_id
        int candidate_id
        datetime created_at
        enum status "NEW, APPROVED_BY_ADMIN, REJECTED, HIRED"
        text admin_notes
    }
```
