# API Design

This document outlines the REST API contract for the RS Recruitment platform.

> **Note:** This file documents the contract for the most stable, externally-facing endpoints. The authoritative source for every endpoint (request/response schemas, status codes, examples) is the FastAPI OpenAPI schema served at `/docs` and `/openapi.json`. When a discrepancy exists, treat the OpenAPI schema as canonical and update this file.

## General Constraints
* **Base URL:** `/api` (for all domain routes). System routes sit at the root `/`.
* **Content-Type:** JSON by default (`application/json`), except for authentication (form-data) and file uploads (multipart).
* **Authentication:** JWT Bearer access token passed in `Authorization: Bearer <token>`. A refresh token is set as an HttpOnly cookie by `/api/auth/login` and consumed by `/api/auth/refresh`.

---

## System Endpoints

### `GET /health`
System health check endpoint.
* **Auth Required:** No
* **Response:** `200 OK`
* **Response Body:** `{"status": "ok", "environment": "development|production"}`

---

## Authentication Endpoints

### `POST /api/auth/register`
Register a new company user and profile. Places the company in a `PENDING_APPROVAL` state.
* **Auth Required:** No
* **Request Body:** JSON (`UserCreate`)
    ```json
    {
      "email": "user@example.com",
      "password": "string",
      "company_profile": {
        "name": "string",
        "logo_url": "string",
        "contact_person": "string",
        "contact_phone": "string"
      }
    }
    ```
* **Response:** `201 Created` | `400 Bad Request` (Email already registered) | `422 Validation Error`
* **Response Body:** `UserWithCompanyRead` object with nested user and company profile:
    ```json
    {
      "user": {
        "id": 1,
        "email": "user@example.com",
        "role": "company",
        "is_active": true,
        "created_at": "2024-01-01T00:00:00"
      },
      "company_profile": {
        "id": 1,
        "user_id": 1,
        "name": "string",
        "logo_url": "string",
        "contact_person": "string",
        "contact_phone": "string",
        "created_at": "2024-01-01T00:00:00"
      }
    }
    ```

### `POST /api/auth/login`
Authenticate a user and receive a JWT access token. Sets an HttpOnly refresh-token cookie.
* **Auth Required:** No
* **Content-Type:** `application/json`
* **Request Body:**
    ```json
    {
      "email": "user@example.com",
      "password": "string"
    }
    ```
* **Response:** `200 OK` | `401 Unauthorized` | `422 Validation Error` | `429 Too Many Requests` (rate-limited)
* **Response Body:**
    ```json
    {
      "access_token": "eyJhbGci...",
      "token_type": "bearer"
    }
    ```

### `POST /api/auth/refresh`
Exchange the HttpOnly refresh-token cookie for a new access token.
* **Auth Required:** No (cookie-based)
* **Response:** `200 OK` (`TokenResponse`) | `401 Unauthorized`

### `POST /api/auth/logout`
Invalidate the current refresh token and clear the cookie.
* **Auth Required:** No (cookie-based)
* **Response:** `204 No Content`

### `POST /api/activate`
Activate a user account via the one-time activation token. Used by both flows:
* COMPANY — admin approval → company clicks link.
* CANDIDATE — self-registration (#605) → candidate clicks link. Branches inside
  the service: creates / links the `CandidateProfile` for the user's email and
  writes consent fields (IP, UA, policy version) at the moment of activation.
* **Auth Required:** No
* **Query:** `?token=<activation-token>`
* **Response:** `200 OK` | `400 Bad Request` (invalid/expired token)

### `POST /api/auth/candidate/register`
Candidate self-registration (Sprint 11 / #605). Creates an `is_active=False`
user and emails a 2-hour activation link; the `CandidateProfile` is created
later at activation time.
* **Auth Required:** No
* **Rate Limit:** 3/hour per IP (slowapi)
* **Request Body:** `{ "email": "string", "password": "string", "full_name": "string", "privacy_accepted": true, "terms_accepted": true }`
* **Response:**
  * `201 Created` — `{ "message": "..." }`. Caller should display a generic
    "check your email" message; do not surface user existence.
  * `409 Conflict` — email already belongs to an active user (no resend
    available for that account through this endpoint).
  * `422 Unprocessable Entity` — consent checkboxes missing or password
    rules failed.
  * `429 Too Many Requests` — IP rate limit exceeded.
* **Re-registration semantics:** if the email matches an `is_active=False`
  candidate user, the existing user's password is updated, prior unused
  activation tokens are deleted, and a new token is minted. Old links die.

### `POST /api/auth/candidate/resend-activation`
Resend the candidate activation email (Sprint 11 / #605). Silent in all
branches to prevent email enumeration.
* **Auth Required:** No
* **Rate Limits:** 5/hour per IP (slowapi) + 1/hour per email (Redis-backed
  counter).
* **Request Body:** `{ "email": "string" }`
* **Response:** `202 Accepted` regardless of whether a matching pending
  candidate exists.

### Login behavior for unactivated candidates
`POST /api/auth/login` returns the existing
`401 Unauthorized` with `detail: "account_pending_activation"` when a user
(company OR candidate) has valid credentials but `is_active=False` and at
least one unused activation token. The frontend uses this string to surface
the "resend activation" affordance.

### `GET /api/invite/{token}`
Public metadata for an invite token (used by the activation page to show context before password entry).
* **Auth Required:** No
* **Response:** `200 OK` (`InviteMetadataPublic`) | `404 Not Found`

---

## Admin Endpoints
Operations exclusively for users with role `ADMIN`.

### `GET /api/admin/companies/pending`
List all companies awaiting approval.
* **Auth Required:** Yes (Admin)
* **Response:** `200 OK`
* **Response Body:** List of `PendingCompanyRead` objects.

### `POST /api/admin/companies/{company_user_id}/approve`
Approve a pending company.
* **Auth Required:** Yes (Admin)
* **Parameters:** `company_user_id` (Integer, Path)
* **Response:** `200 OK` | `404 Not Found` | `400 Bad Request` (Not pending)
* **Response Body:** `ApprovedCompanyRead` object.

### `POST /api/admin/companies/{company_user_id}/reject`
Reject a pending company (Deletes the object from the DB).
* **Auth Required:** Yes (Admin)
* **Parameters:** `company_user_id` (Integer, Path)
* **Response:** `204 No Content` | `404 Not Found` | `400 Bad Request` (Not pending)
* **Response Body:** None

### `GET /api/admin/jobs/pending`
List all jobs awaiting approval.
* **Auth Required:** Yes (Admin)
* **Response:** `200 OK`
* **Response Body:** List of `JobRead` objects.

### `POST /api/admin/jobs/{job_id}/approve`
Approve a pending job posting.
* **Auth Required:** Yes (Admin)
* **Parameters:** `job_id` (Integer, Path)
* **Response:** `200 OK` | `404 Not Found` | `400 Bad Request` (Not pending)
* **Response Body:** Updated `JobRead` object (`status="PUBLISHED"`).

### `POST /api/admin/jobs/{job_id}/reject`
Reject a pending job posting (Deletes the object from the DB).
* **Auth Required:** Yes (Admin)
* **Parameters:** `job_id` (Integer, Path)
* **Response:** `204 No Content` | `404 Not Found` | `400 Bad Request` (Not pending)
* **Response Body:** None

### `POST /api/admin/jobs/{job_id}/contact`
Send the agency-contact email to the company associated with a pending job.
* **Auth Required:** Yes (Admin)
* **Response:** `200 OK` | `404 Not Found`

### Company invites & active companies

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/admin/companies/invites` | Create a new company invite (sends email) |
| `GET` | `/api/admin/companies/invites` | List existing invites |
| `DELETE` | `/api/admin/companies/invites/{invite_id}` | Revoke a pending invite |
| `POST` | `/api/admin/companies/invites/{invite_id}/resend` | Resend an invite email |
| `GET` | `/api/admin/companies/active` | List active (approved) companies |
| `DELETE` | `/api/admin/companies/{company_user_id}` | Delete a company (also removes uploaded files) |

### Candidates & Applications

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/admin/candidates` | List all candidate profiles |
| `GET` | `/api/admin/applications` | List all applications |
| `GET` | `/api/admin/applications/{application_id}` | Application detail |
| `PUT` | `/api/admin/applications/{application_id}/status` | Update application status |
| `DELETE` | `/api/admin/applications/{application_id}` | Delete an application |

> Schemas for the above (request bodies, response shapes, error codes) are defined in `src/schemas.py` and surfaced via the OpenAPI schema. The polish-pass plan (local) tracks the per-entity full-CRUD endpoints still to add.

---

## Resumes

### `GET /api/resumes/{file_key}`
Download a resume file. Authorization is enforced server-side: only the candidate's owning admin (or the candidate themselves, when accounts ship) may fetch.
* **Auth Required:** Yes
* **Response:** `200 OK` (binary) | `403 Forbidden` | `404 Not Found`

---

## Company Endpoints
Operations for authenticated company users to manage their job postings.

### `POST /api/jobs`
Create a new job posting. Automatically set to `PENDING_APPROVAL`.
* **Auth Required:** Yes (Company User)
* **Request Body:** JSON (`JobCreate`)
    ```json
    {
      "title": "Senior Developer",
      "description": "Job details...",
      "requirements": "5+ years experience",
      "location": "Tel Aviv"
    }
    ```
* **Response:** `201 Created` | `422 Validation Error`
* **Response Body:** `JobRead` object.

### `GET /api/jobs`
List all job postings belonging to the authenticated company.
* **Auth Required:** Yes (Company User)
* **Response:** `200 OK`
* **Response Body:** List of `JobRead` objects.

### `GET /api/jobs/{job_id}`
Get a specific job posting belonging to the authenticated company.
* **Auth Required:** Yes (Company User)
* **Parameters:** `job_id` (Integer, Path)
* **Response:** `200 OK` | `404 Not Found`
* **Response Body:** `JobRead` object.

### `PUT /api/jobs/{job_id}`
Update an existing job posting.
* **Auth Required:** Yes (Company User)
* **Parameters:** `job_id` (Integer, Path)
* **Request Body:** JSON (`JobUpdate` - Fields are optional)
* **Response:** `200 OK` | `404 Not Found` | `400 Bad Request` (Cannot update closed/published jobs) | `422 Validation Error`
* **Response Body:** Updated `JobRead` object.

### `DELETE /api/jobs/{job_id}`
Delete a job posting.
* **Auth Required:** Yes (Company User)
* **Parameters:** `job_id` (Integer, Path)
* **Response:** `204 No Content` | `404 Not Found`

---

## Public Endpoints
No authentication required. Strict adherence to Admin Gatekeeper rule (only approved data returned).

### `GET /api/public/jobs`
List all published jobs for the public job board.
* **Auth Required:** No
* **Response:** `200 OK`
* **Response Body:** List of `JobPublicRead` objects. (Excludes internal fields like `company_id` and `updated_at`).

### `GET /api/public/jobs/{job_id}`
Get a specific published job posting.
* **Auth Required:** Optional. Anonymous → standard response. Candidate JWT
  → response includes `my_application: { id, editable } | null` summarizing
  the candidate's own non-WITHDRAWN application for this job (Sprint 11 /
  #606). WITHDRAWN applications are filtered out; `editable` is true iff
  the underlying status is `NEW`. Raw `Application.status` is never sent.
* **Parameters:** `job_id` (Integer, Path)
* **Response:** `200 OK` | `404 Not Found`
* **Response Body:** Single `JobPublicRead` object.

---

## Candidate Endpoints
Unauthenticated leads submitting data to the system.

### `POST /api/candidates/apply`
Submit a candidate profile and resume for a specific job. Sprint 11 / #606
adds three dispatched behaviors on the same endpoint:

1. **Anonymous apply** — no auth, no `password` → existing behavior.
2. **Anonymous claim** — no auth, `password` + `password_confirm` supplied
   → application is still created, AND a pending candidate `User` +
   2-hour `ActivationToken` are minted (reuses the #605 helpers). The
   activation email goes to the candidate's email.
3. **Logged-in candidate apply** — request bears a candidate JWT. The
   form's `email` field is ignored (the session email wins). Consent
   checkboxes are not required (consent was captured at activation per
   #605). `Application.resume_path` snapshots the uploaded resume; the
   candidate's profile is updated with the latest identity fields.
   Non-candidate authed users (ADMIN/COMPANY) receive `403`.

* **Auth Required:** Optional.
* **Content-Type:** `multipart/form-data`
* **Form Data Parameters** (**bold** = required, regular = optional):
  * **`job_id`** (integer)
  * **`full_name`** (string)
  * **`email`** (string)
  * `phone` (string | null)
  * `linkedin_url` (string | null)
  * `service_concept` (string | null)
  * `salary_expectations` (string | null)
  * `strength` (string | null)
  * `growth_area` (string | null)
  * **`privacy_accepted`** / **`terms_accepted`** (bool) — ignored for
    authed candidates; required for anonymous.
  * `password` / `password_confirm` (string | null) — anonymous claim only.
  * `resume` (File | null)
* **Response:**
  * `201 Created` — `CandidateProfileRead`.
  * `403 Forbidden` — authed user is not a candidate.
  * `404 Not Found` — job missing or not published.
  * `409 Conflict` — structured detail:
    * `{"error_code": "email_already_registered"}` — email belongs to an
      active candidate `User`; frontend prompts login.
    * `{"error_code": "already_applied_editable", "application_id": N}` —
      candidate already has a `NEW` application; frontend redirects to
      `/candidate/applications/N`.
    * `{"error_code": "already_applied_locked"}` — candidate already has a
      non-NEW non-WITHDRAWN application. No `application_id` returned
      (Sprint 11 rule: no admin-internal status visibility to candidates).
  * `422 Unprocessable Entity` — validation failure (password rules,
    invalid resume, etc.). `invalid_application` for file errors.
