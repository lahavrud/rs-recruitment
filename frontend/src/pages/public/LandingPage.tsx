import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { getPublicJobs } from "@/services/jobs";
import type { JobPublicRead } from "@/types/api";
import Logo from "@/components/ui/Logo";
import LogoBanner from "@/components/ui/LogoBanner";
import SeoHead, { SITE_URL } from "@/components/ui/SeoHead";

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
  const cardsRef = useRef<HTMLDivElement>(null);
  const [heroLoaded, setHeroLoaded] = useState(false);
  const [cardsVisible, setCardsVisible] = useState<boolean>(
    () => typeof window === "undefined" || !("IntersectionObserver" in window),
  );

  const goNext = () => setActiveIdx((i) => (i + 1) % jobs.length);
  const goPrev = () => setActiveIdx((i) => (i - 1 + jobs.length) % jobs.length);

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }
  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const dx = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(dx) > 40) { if (dx > 0) goNext(); else goPrev(); }
    touchStartX.current = null;
  }

  useEffect(() => {
    const el = cardsRef.current;
    if (!el || !("IntersectionObserver" in window)) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setCardsVisible(true); obs.disconnect(); } },
      { threshold: 0.15 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

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
    <div className="min-h-screen bg-page">
      <SeoHead
        title={t("landing.seo.title")}
        description={t("landing.seo.description")}
        canonical={SITE_URL}
      />
      {/* ── Hero ──────────────────────────────────────── */}
      <section className="texture-wave relative flex min-h-screen flex-col overflow-hidden bg-void">
        {/* preload trigger — zero-size, tells browser to decode image before painting */}
        <img
          src="/hero-city.jpg"
          alt=""
          aria-hidden="true"
          onLoad={() => setHeroLoaded(true)}
          className="pointer-events-none absolute h-0 w-0 opacity-0"
        />
        {/* image layer — fades in only after the file is fully decoded */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: 'url("/hero-city.jpg")',
            backgroundSize: "cover",
            backgroundPosition: "center 60%",
            opacity: heroLoaded ? 1 : 0,
            transition: "opacity 0.9s ease",
          }}
        />
        {/* dark gradient overlay — ensures text stays readable */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-void/85 via-page/72 to-void/92" />
        {/* Nav */}
        <div className="relative z-10 mx-auto w-full max-w-4xl px-6 py-5">
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
        <div className="relative z-10 mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center px-6 pb-16 text-center sm:pb-28 lg:pb-36">
          <LogoBanner />

          {/* Gold rule */}
          <div
            className="mx-auto mt-8 h-px w-36 sm:mt-10 sm:w-56"
            style={{
              background:
                "linear-gradient(to right, transparent, var(--color-copper), var(--color-gold), var(--color-copper), transparent)",
            }}
          />

          <p className="mx-auto mt-6 max-w-sm px-2 text-base font-light tracking-wide text-white/70 sm:mt-8 sm:max-w-lg sm:px-0 sm:text-lg">
            {t("landing.hero.tagline")}
          </p>

          {/* Two audience panels */}
          <div className="mt-12 grid w-full max-w-3xl gap-5 sm:mt-14 sm:grid-cols-2 sm:gap-6">
            {/* For job seekers — primary */}
            <div className="flex flex-col rounded-xl border border-copper/35 bg-black/35 p-7 text-start backdrop-blur-sm sm:p-8">
              <h2 className="text-2xl font-semibold leading-tight text-white/95 sm:text-3xl">
                {t("landing.hero.forSeekers")}
              </h2>
              <p className="mt-1.5 text-sm font-medium text-copper/80">
                {t("landing.hero.seekersHeadline")}
              </p>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-white/65">
                {t("landing.hero.seekersBody")}
              </p>
              <Link
                to="/jobs"
                className="mt-6 inline-block rounded-sm bg-copper px-5 py-2.5 text-center text-sm font-medium text-white transition hover:bg-gold"
              >
                {t("landing.hero.seekersCta")}
              </Link>
            </div>

            {/* For companies — secondary */}
            <div className="flex flex-col rounded-xl border border-white/15 bg-black/25 p-7 text-start backdrop-blur-sm sm:p-8">
              <h2 className="text-2xl font-semibold leading-tight text-white/95 sm:text-3xl">
                {t("landing.hero.forCompanies")}
              </h2>
              <p className="mt-1.5 text-sm font-medium text-copper/80">
                {t("landing.hero.companiesHeadline")}
              </p>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-white/65">
                {t("landing.hero.companiesBody")}
              </p>
              <a
                href={`mailto:${t("landing.contact.email")}`}
                className="mt-6 inline-block rounded-sm border border-copper/50 px-5 py-2.5 text-center text-sm font-medium text-copper/80 transition hover:border-copper hover:text-copper"
              >
                {t("landing.hero.companiesContactCta")}
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── About ─────────────────────────────────────── */}
      <section
        className="texture-wave bg-card-raised py-20 sm:py-28"
      >
        <div className="mx-auto max-w-4xl px-6">
          <div className="grid gap-10 sm:grid-cols-5 sm:gap-20">
            {/* Eyebrow + headline */}
            <div className="sm:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-copper">
                {t("landing.about.eyebrow")}
              </p>
              <div className="mt-3 h-px w-8 bg-copper/40" />
              <p className="mt-5 text-xl font-semibold leading-snug text-white/90 sm:text-2xl">
                {t("landing.about.headline")}
              </p>
            </div>

            {/* Body + pillars */}
            <div className="flex flex-col justify-center sm:col-span-3">
              <p className="text-base leading-relaxed text-white/60">
                <span className="font-josefin text-4xl font-light tracking-widest text-copper sm:text-5xl">RS Recruiting</span>{" "}
                {t("landing.about.body")}
              </p>
              <p className="mt-4 text-base leading-relaxed text-white/60">
                {t("landing.about.body2")}
              </p>
              <p className="mt-8 text-sm tracking-wide text-white/30">
                {t("landing.about.pillars")}
              </p>
            </div>
          </div>

          {/* Numbered pillar cards */}
          <div ref={cardsRef} className="mt-16 grid gap-5 sm:grid-cols-3">
            {(
              [
                { titleKey: "landing.about.feature1Title", bodyKey: "landing.about.feature1Body", num: "01" },
                { titleKey: "landing.about.feature2Title", bodyKey: "landing.about.feature2Body", num: "02" },
                { titleKey: "landing.about.feature3Title", bodyKey: "landing.about.feature3Body", num: "03" },
              ] as const
            ).map((f, idx) => (
              <div
                key={f.titleKey}
                style={{
                  animation: cardsVisible
                    ? `${["card-tilt-in", "card-rise-in", "card-swing-in"][idx]} 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) ${idx * 160}ms both`
                    : "none",
                  opacity: cardsVisible ? undefined : 0,
                }}
              >
                <div className="feature-card feature-card-shimmer h-full rounded-lg border border-white/10 bg-card-raised p-6">
                  <p className="font-display text-4xl font-semibold leading-none text-copper/25 select-none">
                    {f.num}
                  </p>
                  <div
                    className="mt-4 h-px bg-copper/60 transition-all duration-500"
                    style={{
                      width: cardsVisible ? "1.5rem" : "0",
                      transitionDelay: cardsVisible ? `${idx * 160 + 380}ms` : "0ms",
                    }}
                  />
                  <p className="mt-3 font-semibold text-white/90">{t(f.titleKey)}</p>
                  <p className="mt-2 text-sm leading-relaxed text-white/55">
                    {t(f.bodyKey)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured Jobs carousel ─────────────────────── */}
      {!loading && jobs.length > 0 && (
        <section
          className="overflow-hidden border-t border-white/10 bg-section py-16 sm:py-20"
        >
          <div className="mx-auto max-w-4xl px-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white/90">
                {t("landing.featuredJobs.title")}
              </h2>
              <Link
                to="/jobs"
                className="text-sm text-copper transition hover:text-gold"
              >
                {t("landing.featuredJobs.viewAll")}
              </Link>
            </div>

            {/* 3D carousel — swipe on mobile, click side cards on desktop */}
            <div
              className="relative mt-10 select-none"
              style={{ perspective: "1100px", perspectiveOrigin: "50% 50%" }}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateAreas: '"card"',
                  maxWidth: "300px",
                  margin: "0 auto",
                }}
              >
                {jobs.map((job, idx) => {
                  const dist = circDist(activeIdx, idx, jobs.length);
                  const absDist = Math.abs(dist);
                  const isActive = dist === 0;
                  const hidden = absDist > MAX_VISIBLE;

                  const cardCls =
                    "block rounded-xl border border-white/10 bg-card p-5 flex flex-col min-h-[210px]";

                  const cardContent = (
                    <>
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-medium text-white/90">{job.title}</h3>
                        <span className="shrink-0 rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-medium text-success">
                          {t("landing.featuredJobs.open")}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-white/40">{job.location}</p>
                      <p className="mt-3 flex-1 text-sm leading-relaxed text-white/60">
                        {truncate(job.description, 120)}
                      </p>
                      <p className="mt-4 text-xs text-white/30">
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
                        : "w-1.5 bg-white/15 hover:bg-white/25"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Contact ───────────────────────────────────── */}
      <section className="border-t border-white/10 bg-void py-16 text-center">
        <div className="mx-auto max-w-xl px-6">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-copper">
            {t("landing.contact.eyebrow")}
          </p>
          <h2 className="mt-4 text-xl font-semibold text-white/90">
            {t("landing.contact.headline")}
          </h2>
          <p className="mt-2 text-sm text-white/50">{t("landing.contact.body")}</p>
          <a
            href={`mailto:${t("landing.contact.email")}`}
            className="mt-7 inline-block rounded-sm bg-copper px-8 py-3 text-sm font-medium text-white transition hover:bg-gold"
          >
            {t("landing.contact.cta")}
          </a>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────── */}
      <footer
        className="border-t border-white/10 bg-page py-8"
      >
        <div className="mx-auto max-w-4xl px-6">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
            <Logo size={26} />
            <nav className="flex items-center gap-5 text-sm text-white/35">
              <Link to="/jobs" className="transition hover:text-white/70">
                {t("landing.footer.jobs")}
              </Link>
              <Link to="/login" className="transition hover:text-white/70">
                {t("landing.footer.login")}
              </Link>
              {/* register link removed — invite-only */}
            </nav>
            <p className="text-xs text-white/25">
              &copy; {new Date().getFullYear()} <span className="text-copper">RS Recruiting</span>.{" "}
              {t("landing.footer.copyright")}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
