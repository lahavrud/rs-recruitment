# 📋 GitHub Organization Guide

This document outlines the GitHub organization structure and best practices for the RS Recruitment project.

---

## 🏷️ Label System

### Priority Labels
- **P1** (High/Critical Priority) - Urgent issues, blocking bugs, security issues
- **P2** (Medium/High Priority) - Important features, non-blocking bugs
- **P3** (Low/Normal Priority) - Nice-to-have features, minor improvements

### Type Labels
- **feat** - New feature or request
- **fix** - Bug fix
- **chore** - Routine work or maintenance
- **refactor** - Code refactoring
- **test** - Testing, test coverage, or test improvements
- **docs** - Documentation improvements
- **security** - Security-related changes

### Scope Labels
- **backend** - Core server and data management
- **infra** - Infrastructure, DevOps, system-level changes
- **frontend** - Frontend/UI changes (when applicable)
- **api** - API endpoints and contracts
- **config** - Configuration files or settings

### Status Labels
- **bug** - Something isn't working
- **duplicate** - Issue or PR already exists
- **invalid** - Doesn't seem right
- **wontfix** - Will not be worked on
- **question** - Further information requested
- **help wanted** - Extra attention needed
- **good first issue** - Good for newcomers

---

## 📝 Issue Templates

### Task / Feature (`task.md`)
Use for planned work items, features, and development tasks.
- Includes Goal, Scope, Tasks checklist, and Definition of Done
- Default labels: Based on type (feat/chore/etc) + priority

### Bug Report (`bug_report.md`)
Use for reporting bugs or unexpected behavior.
- Includes reproduction steps, expected vs actual behavior
- Default labels: `bug, P2`

### Feature Request (`feature_request.md`)
Use for suggesting new features or enhancements.
- Includes motivation, proposed solution, acceptance criteria
- Default labels: `feat, P3`

### Infrastructure (`infrastructure.md`)
Use for infrastructure, DevOps, or system-level changes.
- Includes technical details, environment scope, breaking changes
- Default labels: `infra, P2`

---

## 🔄 Workflow Best Practices

### Issue Creation
1. **Always use an issue template** - Choose the appropriate template
2. **Set priority** - Add P1/P2/P3 label based on urgency
3. **Add scope labels** - backend, infra, frontend, etc.
4. **Link to project** - Assign to "RS Recruitment - MVP" project
5. **Assign yourself** - Use `--assignee "@me"` when creating via CLI

### Branch Naming
- Features: `feat/short-description`
- Fixes: `fix/short-description`
- Chores: `chore/short-description`
- Docs: `docs/short-description`
- Refactor: `refactor/short-description`

### Pull Request Process
1. **Link to issue** - Reference related issue in PR description
2. **Use PR template** - Fill out Summary, Why, Changes, How to Test
3. **Wait for CI** - Never merge until CI passes
4. **Keep PRs small** - Focus on one feature/fix per PR
5. **Update documentation** - If behavior changes, update docs

### Commit Messages
Use **Conventional Commits** format:
- `feat(scope): description`
- `fix(scope): description`
- `chore(infra): description`
- `refactor(scope): description`
- `docs(scope): description`

---

## 📊 Project Board Organization

### Project: "RS Recruitment - MVP"

**Recommended Columns:**
1. **Backlog** - New issues, not yet prioritized
2. **To Do** - Prioritized and ready to start
3. **In Progress** - Currently being worked on
4. **In Review** - PR created, awaiting review/CI
5. **Done** - Merged and deployed

**Automation Rules:**
- When issue is assigned → Move to "To Do"
- When PR is created → Move to "In Review"
- When PR is merged → Move to "Done"

---

## 🎯 Issue Prioritization Guidelines

### P1 (Critical)
- Security vulnerabilities
- Production bugs blocking core functionality
- Infrastructure failures
- Data loss or corruption risks

### P2 (High)
- Non-blocking bugs
- Important features from roadmap
- Performance issues
- Infrastructure improvements

### P3 (Normal)
- Nice-to-have features
- Minor improvements
- Documentation updates
- Code quality improvements

---

## 🔍 Repository Metadata

### Description
"Specialized CRM for boutique recruitment agency - MVP. FastAPI backend with vertical slices architecture."

### Topics
- `fastapi`
- `python`
- `recruitment`
- `crm`
- `mvp`
- `postgresql`
- `docker`

### README
- Keep README.md up to date with current status
- Link to detailed documentation in `docs/`
- Include CI badge and quick start guide

---

## 📚 Documentation Structure

- **`docs/CONTEXT.md`** - Core philosophy, domain model, coding standards
- **`docs/ARCHITECTURE.md`** - System design, infrastructure decisions
- **`docs/ROADMAP.md`** - Product roadmap and timeline
- **`docs/API_DESIGN.md`** - API endpoints and contracts (when implemented)
- **`docs/GITHUB_ORGANIZATION.md`** - This file

---

## ✅ Checklist for New Issues

- [ ] Used appropriate issue template
- [ ] Added priority label (P1/P2/P3)
- [ ] Added type label (feat/fix/chore/etc)
- [ ] Added scope label (backend/infra/etc)
- [ ] Assigned to project "RS Recruitment - MVP"
- [ ] Assigned to yourself (if working on it)
- [ ] Linked related issues/PRs
- [ ] Filled out all relevant sections

---

## 🚀 Quick Reference Commands

### Create Issue
```bash
gh issue create \
  --title "feat(scope): description" \
  --body-file .github/ISSUE_TEMPLATE/task.md \
  --assignee "@me" \
  --project "RS Recruitment - MVP" \
  --label "feat,P2,backend"
```

### Create PR
```bash
gh pr create \
  --title "feat(scope): description" \
  --body "Closes #123" \
  --assignee "@me" \
  --base main
```

### List Issues by Priority
```bash
gh issue list --label "P1"
gh issue list --label "P2"
gh issue list --label "P3"
```

---

## 📖 Additional Resources

- [GitHub Issues Best Practices](https://docs.github.com/en/issues/tracking-your-work-with-issues/about-issues)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Project Documentation](../docs/CONTEXT.md)
