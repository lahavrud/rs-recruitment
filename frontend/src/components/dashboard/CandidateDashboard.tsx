import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import CompanyName from "@/components/ui/CompanyName";
import { inputCls } from "@/styles/forms";
import {
  getMe,
  listMyApplications,
  patchMe,
  uploadResume,
  type CandidateApplicationListItem,
  type CandidateMeRead,
  type CandidateApplicationsPage,
} from "@/services/candidate";

/**
 * Candidate dashboard.
 *
 * Owns its own hero so it can use the real ``CandidateProfile.full_name``
 * (only available after the /api/candidate/me fetch) instead of the
 * email-local-part shim DashboardPage uses for admin/company.
 *
 * Sections, ordered by what's actionable:
 *   1. Hero with greeting + at-a-glance stats (applications submitted,
 *      profile completion %).
 *   2. Profile completion strip — filled chips (✓) alongside missing
 *      chips (+) so the candidate sees progress, not just a hole.
 *   3. Recent applications — last 3 rows.
 *   4. Browse jobs CTA — copper-tinted card.
 *
 * Both API calls are fired in parallel via ``Promise.allSettled`` — one
 * failing leaves a graceful skeleton/empty state on its own block.
 */
export default function CandidateDashboard() {
  const [me, setMe] = useState<CandidateMeRead | null>(null);
  const [appsPage, setAppsPage] = useState<CandidateApplicationsPage | null>(
    null,
  );

  useEffect(() => {
    let alive = true;
    void Promise.allSettled([getMe(), listMyApplications()]).then(
      ([meResult, appsResult]) => {
        if (!alive) return;
        if (meResult.status === "fulfilled") setMe(meResult.value);
        if (appsResult.status === "fulfilled") setAppsPage(appsResult.value);
        else setAppsPage({ items: [], next_cursor: null });
      },
    );
    return () => {
      alive = false;
    };
  }, []);

  const apps = appsPage?.items.slice(0, 3) ?? null;

  return (
    <div className="space-y-8">
      <Hero me={me} appsPage={appsPage} />
      <ProfileCompletion me={me} onMeChange={setMe} />
      <RecentApplications items={apps} />
      <BrowseJobsCta hasApps={(appsPage?.items.length ?? 0) > 0} />
    </div>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────

function Hero({
  me,
  appsPage,
}: {
  me: CandidateMeRead | null;
  appsPage: CandidateApplicationsPage | null;
}) {
  const { t } = useTranslation();
  const today = new Date().toLocaleDateString("he-IL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const hour = new Date().getHours();
  const greetingKey =
    hour < 12
      ? "dashboard.greeting.morning"
      : hour < 17
        ? "dashboard.greeting.afternoon"
        : hour < 22
          ? "dashboard.greeting.evening"
          : "dashboard.greeting.night";

  // Prefer the candidate's actual first name from the profile; only
  // fall back to the email local-part while the fetch is in flight or
  // failed.
  const fullName = me?.full_name?.trim();
  const firstName = fullName ? fullName.split(/\s+/)[0] : undefined;

  const appsCount = appsPage?.items.length ?? null;
  const completion = profileCompletionPercent(me);

  return (
    <header className="overflow-hidden rounded-2xl border border-white/8 bg-gradient-to-br from-card-raised via-card to-card p-6 sm:p-8">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-copper">
        {today}
      </p>
      <h1 className="mt-3 text-2xl font-semibold text-white/90 sm:text-3xl">
        {t(greetingKey)}
        {firstName && <span className="text-copper/85">{`, ${firstName}`}</span>}
      </h1>
      <p className="mt-2 max-w-prose text-sm text-white/55">
        {t("dashboard.heroSubtitle.candidate")}
      </p>

      <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-lg bg-white/8 sm:grid-cols-2">
        <Stat
          label={t("dashboard.candidate.stats.applicationsSubmitted")}
          value={appsCount === null ? "—" : appsCount.toString()}
          hint={
            appsCount === 0
              ? t("dashboard.candidate.stats.applicationsHintEmpty")
              : appsCount === null
                ? ""
                : t("dashboard.candidate.stats.applicationsHint")
          }
        />
        <Stat
          label={t("dashboard.candidate.stats.profileCompletion")}
          value={completion === null ? "—" : `${completion}%`}
          hint={
            completion === 100
              ? t("dashboard.candidate.stats.profileHintComplete")
              : t("dashboard.candidate.stats.profileHintIncomplete")
          }
        />
      </dl>
    </header>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="bg-card p-4 sm:p-5">
      <dt className="text-[10px] font-medium uppercase tracking-widest text-white/40">
        {label}
      </dt>
      <dd className="mt-1 font-wordmark text-3xl text-copper sm:text-4xl">
        {value}
      </dd>
      {hint && <p className="mt-1 text-xs text-white/40">{hint}</p>}
    </div>
  );
}

// ─── Profile completion ───────────────────────────────────────────────────

/**
 * Returns 0–100 (rounded) for the autofill-fields completion percentage,
 * or null while the profile is still loading. full_name + email are
 * mandatory identity (always present) so they don't count toward this
 * score — the value measures how rich the apply-form autofill will be.
 */
function profileCompletionPercent(me: CandidateMeRead | null): number | null {
  if (me === null) return null;
  const slots = [me.phone, me.linkedin_url, me.resume_path];
  const filled = slots.filter((s) => !!s).length;
  return Math.round((filled / slots.length) * 100);
}

type MissingKey = "phone" | "linkedin" | "resume";

// Matches the `duration-200` on the expand/collapse transition below.
// Centralised so the unmount delay stays in lockstep with the CSS timing.
const EXPAND_TRANSITION_MS = 200;

function ProfileCompletion({
  me,
  onMeChange,
}: {
  me: CandidateMeRead | null;
  onMeChange: (next: CandidateMeRead) => void;
}) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState<MissingKey | null>(null);
  // Keeps the inline editor mounted during the close animation so the
  // collapse looks symmetric to the open. Set synchronously by ``open``
  // and cleared asynchronously by the close-side effect once the
  // transition has finished and the row has visibly closed.
  const [renderField, setRenderField] = useState<MissingKey | null>(null);

  function open(key: MissingKey) {
    setExpanded(key);
    setRenderField(key);
  }
  function close() {
    setExpanded(null);
  }
  function toggle(key: MissingKey) {
    if (expanded === key) close();
    else open(key);
  }

  useEffect(() => {
    if (expanded !== null) return;
    const timeout = setTimeout(() => setRenderField(null), EXPAND_TRANSITION_MS);
    return () => clearTimeout(timeout);
  }, [expanded]);

  // Loading: a minimal stripe placeholder. Once me is loaded and the
  // profile is fully filled, render nothing — the component is purely
  // a nudge for incomplete profiles.
  if (me === null) {
    return (
      <div className="relative overflow-hidden rounded-md border border-white/6 bg-card/40">
        <div className="absolute inset-y-0 start-0 w-0.5 bg-copper/60" />
        <div className="flex items-center gap-3 ps-4 pe-3 py-2.5">
          <div className="h-3 w-24 animate-pulse rounded bg-white/10" />
          <div className="h-6 w-20 animate-pulse rounded-sm bg-white/5" />
          <div className="h-6 w-24 animate-pulse rounded-sm bg-white/5" />
        </div>
      </div>
    );
  }

  const slots: { key: MissingKey; filled: boolean; label: string }[] = [
    {
      key: "phone",
      filled: !!me.phone,
      label: t("dashboard.candidate.profileCompletion.fields.phone"),
    },
    {
      key: "linkedin",
      filled: !!me.linkedin_url,
      label: t("dashboard.candidate.profileCompletion.fields.linkedin"),
    },
    {
      key: "resume",
      filled: !!me.resume_path,
      label: t("dashboard.candidate.profileCompletion.fields.resume"),
    },
  ];
  const missing = slots.filter((s) => !s.filled);

  // Profile is complete — render nothing. The nudge has served its
  // purpose and the dashboard reclaims the vertical space.
  if (missing.length === 0) return null;

  return (
    <div className="group/profile-completion relative overflow-hidden rounded-md border border-white/6 bg-card/40 transition-colors">
      {/* Asymmetric copper accent stripe — anchors the eye to the start
          of the row without painting the whole card copper. */}
      <div className="absolute inset-y-0 start-0 w-0.5 bg-copper/70" />

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 ps-4 pe-3 py-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-white/40">
          {t("dashboard.candidate.profileCompletion.title")}{" "}
          <span className="text-white/55">
            {slots.length - missing.length}/{slots.length}
          </span>
        </p>

        <span className="text-xs text-white/35">·</span>

        <ul className="flex flex-wrap items-center gap-1.5">
          {missing.map((s) => (
            <li key={s.key}>
              <button
                type="button"
                onClick={() => toggle(s.key)}
                aria-expanded={expanded === s.key}
                className={`inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-[11px] transition-all duration-150 ease-out ${
                  expanded === s.key
                    ? "bg-copper/15 text-copper"
                    : "text-white/55 hover:bg-copper/10 hover:text-copper/85"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`transition-transform duration-200 ease-out ${
                    expanded === s.key ? "rotate-45" : ""
                  }`}
                >
                  +
                </span>
                {s.label}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Animated reveal — the grid-template-rows 0fr↔1fr trick lets CSS
          interpolate the auto height without measuring with JS. Opacity
          adds a subtle fade so the editor doesn't pop in at full
          strength while the row is still collapsing/expanding. */}
      <div
        className="grid transition-[grid-template-rows,opacity] duration-200 ease-out"
        style={{
          gridTemplateRows: expanded ? "1fr" : "0fr",
          opacity: expanded ? 1 : 0,
        }}
      >
        <div className="overflow-hidden">
          {renderField && (
            <div className="border-t border-white/6 bg-card-raised/40 ps-4 pe-3 py-3">
              <InlineEditor
                key={renderField}
                field={renderField}
                me={me}
                onSaved={(next) => {
                  onMeChange(next);
                  close();
                }}
                onCancel={close}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Single-purpose inline editor that PATCHes /api/candidate/me (phone /
 * linkedin) or POSTs the resume upload, then bubbles the updated
 * profile back up so the parent re-evaluates which chips remain.
 */
function InlineEditor({
  field,
  me,
  onSaved,
  onCancel,
}: {
  field: MissingKey;
  me: CandidateMeRead;
  onSaved: (next: CandidateMeRead) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const [value, setValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleSave() {
    setSubmitting(true);
    setError(null);
    try {
      const trimmed = value.trim();
      if (!trimmed) {
        setError(t("dashboard.candidate.profileCompletion.inline.required"));
        setSubmitting(false);
        return;
      }
      const patch =
        field === "phone" ? { phone: trimmed } : { linkedin_url: trimmed };
      const next = await patchMe(patch);
      onSaved(next);
    } catch {
      setError(t("dashboard.candidate.profileCompletion.inline.error"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResumePick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSubmitting(true);
    setError(null);
    try {
      const next = await uploadResume(file);
      onSaved(next);
    } catch {
      setError(t("dashboard.candidate.profileCompletion.inline.resumeError"));
    } finally {
      setSubmitting(false);
    }
  }

  if (field === "resume") {
    // Resume needs a file picker — no text input. Keep the row uniform
    // by rendering a button that delegates to a hidden file input.
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] text-white/55">
          {t("dashboard.candidate.profileCompletion.inline.resumeHint")}
        </span>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={submitting}
          className="rounded-sm bg-copper px-3 py-1 text-xs font-medium text-white transition hover:bg-gold disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting
            ? t("common.submitting")
            : t("dashboard.candidate.profileCompletion.inline.resumePick")}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-[11px] text-white/45 transition hover:text-white/70"
        >
          {t("common.cancel")}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx"
          className="sr-only"
          onChange={handleResumePick}
        />
        {error && (
          <p className="basis-full text-[11px] text-danger">{error}</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        type={field === "phone" ? "tel" : "url"}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            void handleSave();
          }
        }}
        autoFocus
        dir="ltr"
        placeholder={
          field === "phone"
            ? "050-000-0000"
            : "https://linkedin.com/in/your-handle"
        }
        className={`${inputCls} max-w-xs py-1.5 text-xs`}
        maxLength={field === "phone" ? 30 : 500}
      />
      <button
        type="button"
        onClick={handleSave}
        disabled={submitting || !value.trim()}
        className="rounded-sm bg-copper px-3 py-1.5 text-xs font-medium text-white transition hover:bg-gold disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? t("common.submitting") : t("common.save")}
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="text-[11px] text-white/45 transition hover:text-white/70"
      >
        {t("common.cancel")}
      </button>
      {error && <p className="basis-full text-[11px] text-danger">{error}</p>}
      {/* When the user is touching the linkedin field we suppress the
          placeholder and let \`me\` hint at their existing value if they
          previously typed one in. */}
      {field === "linkedin" && me.linkedin_url === null && !value && (
        <p className="basis-full text-[11px] text-white/40">
          {t("dashboard.candidate.profileCompletion.inline.linkedinHint")}
        </p>
      )}
    </div>
  );
}

// ─── Recent applications ──────────────────────────────────────────────────

function RecentApplications({
  items,
}: {
  items: CandidateApplicationListItem[] | null;
}) {
  const { t, i18n } = useTranslation();

  if (items === null) {
    return (
      <section>
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-copper">
          {t("dashboard.candidate.recentApplications.title")}
        </p>
        <ul className="space-y-2">
          {[0, 1, 2].map((i) => (
            <li
              key={i}
              className="h-16 animate-pulse rounded-xl border border-white/8 bg-card"
            />
          ))}
        </ul>
      </section>
    );
  }

  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-copper">
          {t("dashboard.candidate.recentApplications.title")}
        </p>
        {items.length > 0 && (
          <Link
            to="/candidate/applications"
            className="text-xs text-white/50 transition hover:text-white/85"
          >
            {t("dashboard.candidate.recentApplications.viewAll")}
          </Link>
        )}
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-white/8 bg-card-raised p-10 text-center">
          <span className="flex size-14 items-center justify-center rounded-full border border-copper/25 bg-copper/8 text-copper">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="size-6"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 7h18M3 7l1.5 12.5A2 2 0 0 0 6.5 21h11a2 2 0 0 0 2-1.5L21 7M3 7l2-4h14l2 4M9 11v6m6-6v6"
              />
            </svg>
          </span>
          <p className="max-w-xs text-sm text-white/65">
            {t("dashboard.candidate.recentApplications.empty")}
          </p>
          <Link
            to="/jobs"
            className="mt-1 inline-flex items-center gap-2 rounded-sm bg-copper px-4 py-2 text-sm font-medium text-white transition hover:bg-gold"
          >
            {t("dashboard.candidate.recentApplications.browseCta")}
            <IconArrow />
          </Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((row) => (
            <li key={row.id}>
              <Link
                to={`/candidate/applications/${row.id}`}
                className="block rounded-xl border border-white/8 bg-card p-4 transition hover:border-white/20 hover:bg-card-raised"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <CompanyName name={row.company.name} className="truncate" />
                  <span className="shrink-0 text-[11px] text-white/45">
                    {formatRelative(row.submitted_at, i18n.language, t)}
                  </span>
                </div>
                <p className="mt-1 truncate text-sm text-white/80">
                  {row.job.title}
                </p>
                {row.job.closed && (
                  <span className="mt-2 inline-block rounded-sm border border-white/15 px-2 py-0.5 text-[10px] uppercase tracking-widest text-white/45">
                    {t("candidate.applications.closedPill")}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ─── Browse jobs CTA ──────────────────────────────────────────────────────

function BrowseJobsCta({ hasApps }: { hasApps: boolean }) {
  const { t } = useTranslation();
  return (
    <section className="relative overflow-hidden rounded-2xl border border-copper/25 bg-gradient-to-br from-copper/15 via-card-raised to-card p-6 sm:p-8">
      {/* Decorative copper glow — pseudo-element via inline span so we
          don't have to touch index.css. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -end-12 -top-12 size-48 rounded-full bg-copper/15 blur-3xl"
      />
      <div className="relative">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-copper">
          {t("dashboard.candidate.browseCta.eyebrow")}
        </p>
        <h2 className="mt-2 text-lg font-semibold text-white/90 sm:text-xl">
          {hasApps
            ? t("dashboard.candidate.browseCta.titleReturning")
            : t("dashboard.candidate.browseCta.titleFirst")}
        </h2>
        <p className="mt-1 max-w-prose text-sm text-white/55">
          {t("dashboard.candidate.browseCta.body")}
        </p>
        <Link
          to="/jobs"
          className="mt-4 inline-flex items-center gap-2 rounded-sm bg-copper px-4 py-2 text-sm font-medium text-white transition hover:bg-gold"
        >
          {t("dashboard.candidate.browseCta.action")}
          <IconArrow />
        </Link>
      </div>
    </section>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────

function IconArrow() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="size-4"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 12h14m0 0-5-5m5 5-5 5"
      />
    </svg>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function formatRelative(
  iso: string,
  _locale: string,
  t: (key: string, opts?: Record<string, unknown>) => string,
): string {
  const submitted = new Date(iso).getTime();
  const now = Date.now();
  const days = Math.max(0, Math.floor((now - submitted) / 86_400_000));
  if (days === 0) return t("candidate.applications.relative.today");
  if (days === 1) return t("candidate.applications.relative.yesterday");
  if (days < 7)
    return t("candidate.applications.relative.daysAgo", { count: days });
  if (days < 30)
    return t("candidate.applications.relative.weeksAgo", {
      count: Math.floor(days / 7),
    });
  if (days < 365)
    return t("candidate.applications.relative.monthsAgo", {
      count: Math.floor(days / 30),
    });
  return t("candidate.applications.relative.yearsAgo", {
    count: Math.floor(days / 365),
  });
}
