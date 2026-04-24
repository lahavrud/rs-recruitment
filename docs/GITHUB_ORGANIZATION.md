# 📋 GitHub Organization Guide

This document outlines the GitHub organization structure and best practices for the RS Recruitment project, updated to reflect the transition to **PostgreSQL**, the adoption of **`uv`**, and automated quality enforcement.

---

## 🏷️ Label System

All labels use a **short, standardized format** for consistency and ease of use.

### Priority Labels

* **P1** - High/Critical Priority (Urgent issues, blocking bugs, security vulnerabilities)
* **P2** - Medium/High Priority (Important features, non-blocking bugs)
* **P3** - Low/Normal Priority (Nice-to-have features, minor improvements)

### Type Labels

* **feat** - New feature or request
* **fix** - Bug fix
* **chore** - Routine work or maintenance
* **security** - Security-related changes
* **refactor**, **test**, **docs**

### Scope Labels

* **backend** - Core server and logic
* **frontend** - Frontend/UI changes
* **database** - PostgreSQL schema, migrations, or connection logic
* **infra** - Infrastructure and system-level changes
* **api**, **config**, **ci**

---

## 📝 Issue Templates

* **Task / Feature (`task.md`)**: Planned work items with Goal, Scope, and Definition of Done.
* **Bug Report (`bug_report.md`)**: Reproduction steps and expected vs actual behavior.
* **Infrastructure (`infrastructure.md`)**: Technical details for DevOps or environment changes.

---

## 🔄 Workflow Best Practices

### Issue Creation

1. **Use Templates**: Choose the appropriate template.
2. **Set Priority**: Add P1/P2/P3 label based on urgency.
3. **Assign Scope**: Tag with `backend`, `database`, `infra`, etc.
4. **Assignee**: Use `--assignee "@me"` for CLI creation.

### Pull Request Process

1. **Pre-commit Hooks**: Must pass locally before PR creation (validated via `uv run pre-commit`).
2. **Link to Issue**: Use "Closes #123" in the description.
3. **Wait for CI**: Never merge until `lint`, `test`, and `docker-build` pass.
4. **Squash Merge**: Preferred for maintaining a clean trunk history.

### Commit Messages

Use **Conventional Commits** format: `feat(scope): description`.

---

## 📊 Project Board Organization

### Project: "RS Recruitment - MVP"

**Status Field Columns:**

1. **Icebox 🧊**: Nice-to-have, local mocks, advanced monitoring, or premature optimization.
2. **Blocked ⛔**: Features waiting on upstream dependencies.
3. **Ready (MVP) 🎯**: Core business features ready to be coded now.
4. **In Progress 🏗️**: The **single** task currently being worked on.

### Column Assignment Rules

* **Rule 1: The "Infra Trap" (Icebox 🧊)**: Any task related to "Improving CI", "Refactoring", "Advanced Monitoring", or "LocalStack/Mocking" must go here to avoid distracting from the MVP.
* **Rule 2: Backend-First**: No `frontend` issue may move to **In Progress** until the corresponding backend API vertical slice is **Done**.
* **Rule 3: The Driver**: Only **ONE** feature should be "In Progress" to maintain focus on the current vertical slice.

---

## 🎯 Milestones

Each milestone aligns with a development phase from `docs/ROADMAP.md`.

1. **Infrastructure Phase**: Setup, CI/CD, and the transition to **PostgreSQL Local Parity**.
2. **Company Slice**: Registration, auth, and admin approval workflow.
3. **Job Slice**: Job CRUD and public read APIs.
4. **Candidate Slice**: Application submission and shadow profile logic.
5. **Match Slice**: Admin dashboard and notification triggers.
6. **Frontend**: SPA setup and dashboard implementation.
7. **Deployment**: **P1 Blockers** (Database Backup Strategy) and production deploys.

---

## 🚀 Quick Reference Commands

### Create Task with UV

```bash
gh issue create \
  --title "feat(database): transition to asyncpg for postgres" \
  --body-file .github/ISSUE_TEMPLATE/task.md \
  --assignee "@me" \
  --project "RS Recruitment - MVP" \
  --label "feat,P2,database" \
  --milestone "Infrastructure Phase"

```

### Local Validation

```bash
uv run pre-commit run --all-files
uv run pytest -n auto

```

---

## ⚙️ Repository Settings

* **Merge Method**: Squash Merge enabled (default).
* **Branch Protection**: `main` protected; CI checks (`lint`, `test`) must pass; no direct pushes.
* **Metadata**: Includes `postgresql`, `fastapi`, `uv`, and `vertical-slices`.
