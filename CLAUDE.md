# RS Recruitment — Developer Guide

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite + Tailwind v4
- **Backend**: FastAPI (Python) + SQLModel async + PostgreSQL
- **Auth**: JWT access token in `localStorage` + HttpOnly refresh-token cookie. `AuthContext` resolves initial state synchronously from `localStorage` and verifies via `/api/auth/me` on mount.
- **i18n**: react-i18next, Hebrew-only (`he`), RTL forced globally via `<html dir="rtl" lang="he">`
- **Routing**: React Router v7

---

## Frontend Architecture

### Directory layout

```
frontend/src/
├── components/
│   ├── AdminRoute.tsx        # Route guard: requires role=ADMIN
│   ├── CompanyRoute.tsx      # Route guard: requires role=COMPANY
│   ├── ProtectedRoute.tsx    # Route guard: requires authenticated user
│   ├── layout/
│   │   ├── AppShell.tsx      # Root layout switcher (auth / public / bare)
│   │   ├── Header.tsx        # Authenticated top bar
│   │   └── Sidebar.tsx       # Authenticated nav sidebar (mobile drawer + desktop)
│   └── ui/
│       ├── Logo.tsx          # SVG logo with opacity fade-in on load
│       ├── LogoBanner.tsx    # Hero-size logo + wordmark
│       └── PageHeader.tsx    # Copper eyebrow + gold rule + subtitle (reusable)
├── pages/
│   ├── ActivatePage.tsx      # Token-based account activation
│   ├── DashboardPage.tsx     # Authenticated landing (role-aware)
│   ├── LoginPage.tsx
│   ├── NotFoundPage.tsx
│   ├── RegisterPage.tsx
│   ├── admin/                # Admin-only (AdminRoute)
│   │   ├── AdminApplicationsPage.tsx
│   │   ├── AdminCandidatesPage.tsx
│   │   ├── AdminCompaniesPage.tsx
│   │   └── AdminJobsPage.tsx
│   ├── company/              # Company-only (CompanyRoute)
│   │   └── CompanyJobsPage.tsx
│   └── public/               # Unauthenticated
│       ├── ApplicationPage.tsx
│       ├── JobBoardPage.tsx
│       ├── JobDetailPage.tsx
│       └── LandingPage.tsx
├── contexts/                 # AuthContext
├── styles/
│   └── forms.ts              # Shared dark-input CSS class strings (inputCls, textareaCls, selectCls)
├── locales/
│   └── he.json               # All UI strings in Hebrew
└── index.css                 # Tailwind @theme tokens + global utilities
```

### AppShell routing logic

`AppShell` inspects `pathname` and renders one of three shells:

| Condition | Shell |
|---|---|
| `/`, `/login`, `/register`, `/activate` | Bare — page owns its own layout |
| Authenticated (admin or company) | Header + Sidebar + `bg-page` main area |
| Unauthenticated (public) | `PublicHeader` + `bg-page` main area |

### Routes (App.tsx)

| Path | Guard | Page |
|---|---|---|
| `/` | — | `LandingPage` |
| `/login` `/register` `/activate` | — | Auth pages |
| `/jobs` `/jobs/:id` `/jobs/:id/apply` | — | Public job board + apply |
| `/dashboard` | `ProtectedRoute` | Role-aware `DashboardPage` |
| `/admin/companies` `/admin/jobs` `/admin/applications` `/admin/candidates` | `AdminRoute` | Admin pages |
| `/company/jobs` | `CompanyRoute` | `CompanyJobsPage` |

---

## Design System

### Philosophy
Dark luxury boutique aesthetic. Minimal, warm, metallic accents. Every color must come from the token system — **no hardcoded hex values in component files**.

### Color tokens (`index.css` `@theme`)

All tokens are available as Tailwind utilities (`bg-*`, `text-*`, `border-*`, `from-*`, etc.).

#### Dark surfaces (light → deep)
| Token | Value | Usage |
|---|---|---|
| `card-raised` | `#1E1C1A` | Modals, elevated cards, section backgrounds, hover targets |
| `card` | `#1A1816` | Default card and panel surfaces |
| `section` | `#181614` | Landing page dark section backgrounds |
| `well` | `#141210` | Form inputs, table headers (sunken surface) |
| `page` | `#121110` | Main app / content area background |
| `void` | `#0D0B09` | Navigation bars, header, auth page backgrounds |

#### Brand metals
| Token | Usage |
|---|---|
| `copper` (`#B87333`) | Primary brand accent, CTAs, active states, eyebrow text |
| `gold` (`#C9A84C`) | Hover state for copper elements, gradient highlights |
| `copper-dark` | Pressed/dark variant |
| `nickel` | Neutral metallic text |

#### Light palette (admin/company shell)
The light tokens (`canvas`, `surface`, `ink`, `line`, etc.) are defined but currently only used in the authenticated shell for potential future light-mode admin views.

#### Status
`success`, `warning`, `danger`, `info`, `hired` — semantic status colors.

### Typography
- **Body / headings**: Inter (weights 300, 400, 500, 600) — hierarchy via weight and size only, no separate display typeface
- **Brand wordmark**: Cormorant Garamond (`font-wordmark`, `font-light tracking-widest text-gold/60`) — used for "RS Recruiting" in LogoBanner and landing hero only. Never apply to body text or UI headings.
- Hebrew text renders RTL automatically

### Spacing / shape conventions
- Cards: `rounded-xl border border-white/8 bg-card`
- Inputs: import `inputCls` from `@/styles/forms` — never define locally
- Buttons primary: `rounded-sm bg-copper px-* py-* text-sm font-medium text-white hover:bg-gold`
- Buttons ghost: `rounded-sm border border-white/20 text-white/60 hover:border-white/40 hover:text-white/90`
- Eyebrow labels: `text-[10px] font-semibold uppercase tracking-widest text-copper`

### PageHeader component

Use `<PageHeader>` for all page headings in authenticated and public-shell pages:

```tsx
<PageHeader
  eyebrow={t("page.title")}          // small caps copper label
  subtitle={t("page.subtitle")}      // optional muted description
  action={<Button />}                // optional right-side element (badge, CTA)
/>
```

The `action` slot is for badges (pending count) or primary action buttons. For pages with a large `<h1>` below the eyebrow (like `JobBoardPage`), inline the eyebrow + rule pattern directly.

### CompanyName component

Use `<CompanyName>` wherever a company name is rendered in the UI — it is the canonical copper-accent treatment:

```tsx
import CompanyName from "@/components/ui/CompanyName";

<CompanyName name={row.company_profile.name} />
// optional className for layout (e.g. "truncate block")
<CompanyName name={row.company_profile.name} className="truncate block" />
```

`text-copper font-medium`, inherits surrounding text size. Never render company names as plain text in tables, cards, or detail views.

In email templates (`src/templates/email.py`) use the `_company(name)` helper — it produces the equivalent inline-style copper span.

### Shared form styles

```ts
import { inputCls, textareaCls, selectCls } from "@/styles/forms";
```

These produce dark-themed inputs consistent with `bg-well`, copper focus ring, and white/85 text. Always import from here — never copy the class string.

---

## Patterns & Conventions

### Error handling
- Never pass raw backend `detail` strings to the UI — they may be English
- Map HTTP status codes to Hebrew `t()` keys:
  - `429` → `errors.tooManyAttempts`
  - `409` → `errors.emailExists` / `errors.alreadyApplied`
  - `404` → `errors.notFound` / `errors.unavailable`
  - `403` → `errors.accountInactive`
  - default → generic Hebrew error key

### Translations
All strings live in `frontend/src/locales/he.json`. Keys are namespaced by feature:
- `auth.login.*`, `auth.register.*`
- `landing.*`, `publicJobs.*`
- `admin.*`, `company.*`, `dashboard.*`

Write production-quality Hebrew — not literal translations. Prefer warm, direct phrasing.

### Rate limiting
The backend uses `slowapi` with:
- Login: 5 / minute
- Register: 3 / hour

The frontend handles `429` explicitly with Hebrew messages. The raw slowapi detail string (`"5 per 1 minute"`) is never shown.

### Authentication flow
- Access token in `localStorage`; refresh token in HttpOnly cookie set by backend
- `AuthContext` resolves initial state synchronously from `localStorage`, then verifies via `/api/auth/me` on mount
- `ProtectedRoute`, `AdminRoute`, `CompanyRoute` enforce role-based access
- Login redirects to `/dashboard`; unauthenticated access redirects to `/login`
- Activation flow: invite token → `/activate` → password set → login

### Logo loading
`Logo.tsx` renders `opacity-0` until the SVG `onLoad` fires, then fades to `opacity-1` (0.25s ease). This prevents the flash of broken-image placeholder on first load.

### Eager loading (avoiding N+1)
When a service flow accesses related rows (e.g. `Job.company.user`), load them in the original SELECT with `selectinload` at the call site:

```python
select(Job)
    .options(selectinload(Job.company).selectinload(CompanyProfile.user))
    .where(Job.id == job_id)
```

Prefer `selectinload` at the call site over `lazy="selectin"` on the model unless the relationship is *always* needed wherever the parent is loaded — relationship-level eager loading pollutes list endpoints and other paths that don't need the child rows. For ad-hoc one-shot joins where no SQLModel relationship exists (e.g. `ActivationToken` → `User`), a plain `.join(User, User.id == ActivationToken.company_user_id)` returning a tuple is fine.

---

## Adding a New Page

1. Create the page in the appropriate `pages/` subdirectory
2. Use `PageHeader` for the heading
3. Use `inputCls` / `textareaCls` from `@/styles/forms` for any inputs
4. Use only token-based Tailwind classes — no `bg-[#hex]` or inline style colors
5. Map all error states to `t()` keys in `he.json`
6. Register the route in `App.tsx` with the appropriate route guard

---

## Running Locally

```bash
# Backend
uvicorn src.main:app --reload

# Frontend
cd frontend && npm run dev
```

The frontend proxies `/api/*` to `http://localhost:8000` (configured in `vite.config.ts`).

---

## GitHub workflow conventions — MUST follow

This project has its own templates and naming conventions. **Always use them; do not fall back to generic GitHub defaults.**

### Branch names
Format: `<type>/<short-kebab-summary>`. Types observed in `git log`: `feat`, `fix`, `chore`, `docs`, `hotfix`, `feature`, `refactor`. Match an existing type rather than inventing one.

### Commit messages
**Conventional Commits**, with optional scope. Examples from `main`:
- `feat(auth): refresh tokens, account lockout, password rules`
- `fix(email): SMTP timeout + production config from SSM`
- `docs: refresh CLAUDE.md and docs/* to match current state`
- `chore: bump python-jose for security patches`

Do **not** add `Co-Authored-By:` trailers — they don't appear on commits in this repo.

### Pull requests
Title matches the commit message style (Conventional Commits). Body **must** follow `.github/pull_request_template.md`:

```
## Summary
Short description of the change.

## Why
What problem does this PR solve?

## Changes
-
-

## How to Test
Steps to verify the changes.

## Related Issue
Closes #
```

If there is no related issue, write `N/A` — don't omit the section. Don't add other top-level sections (no "Test plan", no "Generated with…" footers).

### Issues
Three templates exist in `.github/ISSUE_TEMPLATE/`: `bug_report.md`, `feature_request.md`, `task.md`. Pick the matching one and fill every section. Each template includes a `🎯 Milestone` selector — pick from the listed phases (Infrastructure / Company / Job / Candidate / Match / Frontend / Deployment).

---

## Linting — MUST run before every commit

**Always run both linters before committing. CI will fail if either fails.**

```bash
# Backend — ruff (lint + format check)
uv run ruff check .
uv run ruff format --check .

# Auto-fix format
uv run ruff format .

# Frontend — TypeScript + ESLint
cd frontend && npx tsc --noEmit && npm run lint
```

Common pitfalls:
- `E501` line too long (88 char limit) — wrap long strings with implicit concatenation
- `ruff format` must also pass (not just `ruff check`) — run `uv run ruff format .` to auto-fix
- ESLint `no-unused-expressions` — use `if/else` instead of ternary side-effects
- ESLint `react-hooks/set-state-in-effect` — don't call `setState` synchronously in `useEffect` body; use lazy `useState` initializer or a callback instead
