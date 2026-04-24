import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { getPublicJobs } from "@/services/jobs";
import type { JobPublicRead } from "@/types/api";
import Logo from "@/components/ui/Logo";
import LogoBanner from "@/components/ui/LogoBanner";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("he-IL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + "…";
}

const MAX_VISIBLE = 2;

function circDist(active: number, idx: number, n: number): number {
  const d = ((active - idx) % n + n) % n;
  return d > n / 2 ? d - n : d;
}

export default function LandingPage() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const [jobs, setJobs] = useState<JobPublicRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIdx, setActiveIdx] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const goNext = () => setActiveIdx((i) => (i + 1) % jobs.length);
  const goPrev = () => setActiveIdx((i) => (i - 1 + jobs.length) % jobs.length);

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }
  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const dx = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(dx) > 40) dx > 0 ? goNext() : goPrev();
    touchStartX.current = null;
  }

  useEffect(() => {
    let cancelled = false;
    async function fetchJobs() {
      try {
        const data = await getPublicJobs();
        if (!cancelled) setJobs(data.slice(0, 10));
      } catch {
        // featured jobs are optional
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchJobs();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-canvas">
      {/* ── Hero ──────────────────────────────────────── */}
      <section
        className="texture-wave flex min-h-screen flex-col"
        style={{ backgroundColor: "#1C1917" }}
      >
        {/* Nav */}
        <div className="mx-auto w-full max-w-4xl px-6 py-5">
          <div className="flex items-center justify-between">
            <Logo />
            <div className="flex items-center gap-5">
              <Link
                to="/jobs"
                className="text-sm text-white/40 transition hover:text-white/70"
              >
                {t("landing.footer.jobs")}
              </Link>
              {isAuthenticated ? (
                <Link
                  to="/dashboard"
                  className="rounded-sm border border-white/20 px-4 py-1.5 text-sm text-white/60 transition hover:border-white/40 hover:text-white/90"
                >
                  {t("nav.dashboard")}
                </Link>
              ) : (
                <Link
                  to="/login"
                  className="rounded-sm border border-white/20 px-4 py-1.5 text-sm text-white/60 transition hover:border-white/40 hover:text-white/90"
                >
                  {t("landing.hero.login")}
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Centered hero content — vertically fills remaining space */}
        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-6 pb-16 text-center sm:pb-24">
          <LogoBanner />

          {/* Gold rule */}
          <div
            className="mx-auto mt-7 h-px w-28 sm:mt-9 sm:w-36"
            style={{
              background:
                "linear-gradient(to right, transparent, #B87333, #C9A84C, #B87333, transparent)",
            }}
          />

          <p className="mx-auto mt-6 max-w-sm px-2 text-sm leading-relaxed text-white/45 sm:mt-8 sm:max-w-md sm:px-0 sm:text-base">
            {t("landing.hero.subtitle")}
          </p>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-3">
            <Link
              to="/jobs"
              className="w-full rounded-sm bg-copper px-8 py-3 text-sm font-medium text-white transition hover:bg-gold sm:w-auto"
            >
              {t("landing.hero.browseJobs")}
            </Link>
            {!isAuthenticated && (
              <Link
                to="/register"
                className="w-full rounded-sm border border-white/20 px-8 py-3 text-sm text-white/55 transition hover:border-white/35 hover:text-white/80 sm:w-auto"
              >
                {t("landing.footer.register")}
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ── About ─────────────────────────────────────── */}
      <section className="texture-paper bg-canvas py-20 sm:py-28">
        <div className="mx-auto max-w-4xl px-6">
          <div className="grid gap-10 sm:grid-cols-5 sm:gap-20">
            {/* Eyebrow + headline */}
            <div className="sm:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-copper">
                {t("landing.about.eyebrow")}
              </p>
              <div className="mt-3 h-px w-8 bg-copper/40" />
              <p className="mt-5 text-xl font-semibold leading-snug text-ink sm:text-2xl">
                {t("landing.about.headline")}
              </p>
            </div>

            {/* Body + pillars */}
            <div className="flex flex-col justify-center sm:col-span-3">
              <p className="text-base leading-relaxed text-ink-2">
                {t("landing.about.body")}
              </p>
              <p className="mt-8 text-sm tracking-wide text-ink-3">
                {t("landing.about.pillars")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Featured Jobs carousel ─────────────────────── */}
      {!loading && jobs.length > 0 && (
        <section className="overflow-hidden border-t border-line bg-surface py-16 sm:py-20">
          <div className="mx-auto max-w-4xl px-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-ink">
                {t("landing.featuredJobs.title")}
              </h2>
              <Link
                to="/jobs"
                className="text-sm text-copper transition hover:text-gold"
              >
                {t("landing.featuredJobs.viewAll")} ←
              </Link>
            </div>

            {/* 3D carousel — swipe on mobile, click side cards on desktop */}
            <div
              className="relative mt-10 select-none"
              style={{ perspective: "900px", perspectiveOrigin: "50% 50%" }}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              <div style={{ display: "grid", gridTemplateAreas: '"card"' }}>
                {jobs.map((job, idx) => {
                  const dist = circDist(activeIdx, idx, jobs.length);
                  const absDist = Math.abs(dist);
                  const isActive = dist === 0;
                  const hidden = absDist > MAX_VISIBLE;

                  const cardCls =
                    "block rounded-xl border border-line bg-canvas p-6";

                  const cardContent = (
                    <>
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-medium text-ink">{job.title}</h3>
                        <span className="shrink-0 rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-medium text-success">
                          {t("landing.featuredJobs.open")}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-ink-3">{job.location}</p>
                      <p className="mt-3 text-sm leading-relaxed text-ink-2">
                        {truncate(job.description, 160)}
                      </p>
                      <p className="mt-4 text-xs text-ink-3">
                        {t("common.posted")} {formatDate(job.created_at)}
                      </p>
                    </>
                  );

                  return (
                    <div
                      key={job.id}
                      className="carousel-card"
                      style={
                        {
                          gridArea: "card",
                          "--offset": dist / MAX_VISIBLE,
                          "--abs-offset": absDist / MAX_VISIBLE,
                          "--direction": Math.sign(dist),
                          opacity: hidden ? 0 : 1,
                          display: hidden ? "none" : "block",
                          zIndex: 10 - absDist,
                        } as React.CSSProperties
                      }
                    >
                      {isActive ? (
                        <Link to={`/jobs/${job.id}`} className={cardCls}>
                          {cardContent}
                        </Link>
                      ) : (
                        <div
                          className={`${cardCls} cursor-pointer`}
                          onClick={() => setActiveIdx(idx)}
                          role="button"
                          tabIndex={-1}
                        >
                          {cardContent}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Dot indicators */}
            {jobs.length > 1 && (
              <div className="mt-8 flex justify-center gap-2">
                {jobs.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveIdx(idx)}
                    aria-label={`משרה ${idx + 1}`}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      idx === activeIdx
                        ? "w-5 bg-copper"
                        : "w-1.5 bg-line-2 hover:bg-line"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Footer ────────────────────────────────────── */}
      <footer className="border-t border-line bg-canvas py-8">
        <div className="mx-auto max-w-4xl px-6">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
            <Logo size={26} />
            <nav className="flex items-center gap-5 text-sm text-ink-3">
              <Link to="/jobs" className="transition hover:text-ink">
                {t("landing.footer.jobs")}
              </Link>
              <Link to="/login" className="transition hover:text-ink">
                {t("landing.footer.login")}
              </Link>
              {!isAuthenticated && (
                <Link to="/register" className="transition hover:text-ink">
                  {t("landing.footer.register")}
                </Link>
              )}
            </nav>
            <p className="text-xs text-ink-3">
              &copy; {new Date().getFullYear()} RS Recruiting.{" "}
              {t("landing.footer.copyright")}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
