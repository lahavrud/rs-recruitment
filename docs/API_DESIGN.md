# API Design

This document outlines the REST API contract for the RS Recruitment platform. 

## General Constraints
* **Base URL:** `/api` (for all domain routes). System routes sit at the root `/`.
* **Content-Type:** JSON by default (`application/json`), except for authentication (form-data) and file uploads (multipart).
* **Authentication:** JWT Bearer tokens passed in the `Authorization` header (`Bearer <token>`).

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
* **Response Body:** `UserRead` object (Excludes password hash).

### `POST /api/auth/login`
Authenticate a user and receive a JWT access token.
* **Auth Required:** No
* **Content-Type:** `application/x-www-form-urlencoded`
* **Request Body:**
  * `username` (Email address)
  * `password`
* **Response:** `200 OK` | `401 Unauthorized` | `422 Validation Error`
* **Response Body:**
    ```json
    {
      "access_token": "eyJhbGci...",
      "token_type": "bearer"
    }
    ```

---

## Admin Endpoints
Operations exclusively for users with `is_admin=True`.

### `GET /api/admin/companies/pending`
List all companies awaiting approval.
* **Auth Required:** Yes (Admin)
* **Response:** `200 OK`
* **Response Body:** List of `PendingCompanyRead` objects.

### `POST /api/admin/companies/{user_id}/approve`
Approve a pending company.
* **Auth Required:** Yes (Admin)
* **Parameters:** `user_id` (Integer, Path)
* **Response:** `200 OK` | `404 Not Found` | `400 Bad Request` (Not pending)
* **Response Body:** `ApprovedCompanyRead` object.

### `POST /api/admin/companies/{user_id}/reject`
Reject a pending company (Deletes the object from the DB).
* **Auth Required:** Yes (Admin)
* **Parameters:** `user_id` (Integer, Path)
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
* **Auth Required:** No
* **Parameters:** `job_id` (Integer, Path)
* **Response:** `200 OK` | `404 Not Found`
* **Response Body:** Single `JobPublicRead` object.

---

## Candidate Endpoints
Unauthenticated leads submitting data to the system.

### `POST /api/candidates/apply`
Submit a candidate profile and resume for a specific job.
* **Auth Required:** No
* **Content-Type:** `multipart/form-data`
* **Form Data Parameters** (**bold** = required, regular = optional):
  * **`job_id`** (integer)
  * **`full_name`** (string)
  * **`email`** (string)
  * `phone` (string | null)
  * `linkedin_url` (string | null)
  * `service_concept` (string | null)
  * `salary_expectations` (string | null)
  * `military_service_details` (string | null)
  * `transportation` (string | null)
  * `personality_weakness` (string | null)
  * `personality_strength` (string | null)
  * `resume` (File | null)
* **Response:** `201 Created` | `404 Not Found` (Job unavailable) | `422 Validation Error`
* **Response Body:** `CandidateProfileRead` object (Contains the assigned Candidate ID and internal file reference).
