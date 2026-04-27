# RS Recruitment — Developer Guide

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite + Tailwind v4
- **Backend**: FastAPI (Python) + SQLAlchemy async + PostgreSQL
- **Auth**: JWT (access token stored in memory via `AuthContext`)
- **i18n**: react-i18next, Hebrew-only (`he`), RTL forced globally via `<html dir="rtl" lang="he">`
- **Routing**: React Router v7

---

## Frontend Architecture

### Directory layout

```
frontend/src/
├── components/
│   ├── layout/
│   │   ├── AppShell.tsx      # Root layout switcher (public / authenticated / full-page)
│   │   ├── Header.tsx        # Authenticated top bar
│   │   └── Sidebar.tsx       # Authenticated nav sidebar
│   └── ui/
│       ├── Logo.tsx          # SVG logo with opacity fade-in on load
│       ├── LogoBanner.tsx    # Hero-size logo + wordmark
│       └── PageHeader.tsx    # Copper eyebrow + gold rule + subtitle (reusable)
├── pages/
│   ├── LoginPage.tsx
│   ├── RegisterPage.tsx
│   ├── DashboardPage.tsx
│   ├── NotFoundPage.tsx
│   ├── admin/                # Admin-only pages (AdminRoute guard)
│   └── public/               # Unauthenticated pages
│       ├── LandingPage.tsx
│       ├── JobBoardPage.tsx
│       ├── JobDetailPage.tsx
│       └── ApplicationPage.tsx
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
| `/`, `/login`, `/register` | Bare — page owns its own layout |
| Authenticated | Header + Sidebar + `bg-page` main area |
| Unauthenticated (public) | `PublicHeader` + `bg-page` main area |

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
- **Body**: Inter (weights 300, 400, 500, 600)
- **Display**: Playfair Display — use `.font-display` class for serif headings
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
- `AuthContext` fetches `/api/auth/me` on mount to restore session
- JWT stored in memory (not localStorage) — no XSS exposure
- `ProtectedRoute`, `AdminRoute`, `CompanyRoute` enforce role-based access
- Login redirects to `/dashboard`; unauthenticated access redirects to `/login`

### Logo loading
`Logo.tsx` renders `opacity-0` until the SVG `onLoad` fires, then fades to `opacity-1` (0.25s ease). This prevents the flash of broken-image placeholder on first load.

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
