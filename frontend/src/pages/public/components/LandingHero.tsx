import { type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LogoBanner from "@/components/ui/LogoBanner";

const SEARCH_TAGS = ["תפקיד", "מיקום"] as const;

/** Card / panel rise */
function cardRise(visible: boolean, delay = "0s"): CSSProperties {
  return visible
    ? { animation: `card-reveal 0.75s cubic-bezier(0.215, 0.61, 0.355, 1) ${delay} both` }
    : { opacity: 0, transform: "translateY(36px)" };
}

/** Clip-based text reveal. Parent MUST have overflow-hidden. */
function clipRise(visible: boolean, delay = "0s"): CSSProperties {
  return visible
    ? { animation: `text-clip-rise 0.8s cubic-bezier(0.215, 0.61, 0.355, 1) ${delay} both` }
    : { transform: "translateY(105%)" };
}

interface LandingHeroProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onSearchSubmit: (e: React.FormEvent) => void;
  audienceVisible: boolean;
  audienceRef: React.RefObject<HTMLDivElement | null>;
}

export default function LandingHero({
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  audienceVisible,
  audienceRef,
}: LandingHeroProps) {
  const { t } = useTranslation(['common', 'landing']);

  return (
    <>
      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="texture-wave relative flex min-h-screen flex-col">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-void/90 via-page/75 to-void/70" />

        {/* Centered content */}
        <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-6 pb-16 text-center sm:pb-24">
          <LogoBanner />
          <h1 className="sr-only">{t("landing:seo.h1")}</h1>

          <div
            className="mx-auto mt-7 h-px w-32 sm:mt-8 sm:w-48"
            style={{
              background:
                "linear-gradient(to right, transparent, var(--color-copper), var(--color-gold), var(--color-copper), transparent)",
            }}
          />

          <p className="mt-5 text-base font-light tracking-wide text-white/72 sm:mt-6 sm:text-lg">
            {t("landing:hero.tagline")}
          </p>

          {/* Search bar */}
          <form onSubmit={onSearchSubmit} className="mt-9 w-full sm:mt-11">
            <div className="flex items-center overflow-hidden rounded-full border border-white/20 bg-black/45 shadow-xl backdrop-blur-md transition-colors focus-within:border-copper/50">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={t("landing:hero.searchPlaceholder")}
                className="min-w-0 flex-1 bg-transparent py-4 pe-4 ps-6 text-base text-white/90 placeholder:text-white/35 focus:outline-none sm:text-lg"
              />
              <button
                type="submit"
                aria-label={t("common:search")}
                className="m-1.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-copper text-white transition hover:bg-gold"
              >
                <svg
                  width="16" height="16" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" strokeWidth="2.5"
                  strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
              </button>
            </div>

            <div className="mt-3.5 flex items-center justify-center gap-2 text-xs text-white/25">
              <span>חפש לפי:</span>
              {SEARCH_TAGS.map((tag) => (
                <span key={tag} className="rounded-full border border-white/10 px-2.5 py-0.5">
                  {tag}
                </span>
              ))}
            </div>
          </form>
        </div>
      </section>

      {/* ── Audience panels — image is shared with hero (above); just paint
            the gradient overlay that fades into the next dark section. ─── */}
      <section className="relative py-10 sm:py-14">
        {/* Seamless continuation of the hero: start at solid void (matching hero bottom),
            fade to card-raised so there is no lighter stripe at the section boundary. */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: `linear-gradient(to bottom,
              var(--color-void) 0%,
              color-mix(in srgb, var(--color-void) 80%, transparent) 20%,
              var(--color-card-raised) 42%
            )`,
          }}
        />

        <div className="relative z-10 mx-auto max-w-4xl px-6">
          <div className="grid gap-4 sm:grid-cols-[3fr_2fr] sm:gap-5" ref={audienceRef}>

            {/* Primary: job seekers — card rises first */}
            <div
              className="flex flex-col rounded-xl border border-copper/25 bg-card-raised p-6 text-start sm:p-8"
              style={cardRise(audienceVisible, "0s")}
            >
              <p className="text-[10px] font-semibold uppercase tracking-widest text-copper/70">
                {t("landing:hero.forSeekers")}
              </p>
              {/* Heading clip-reveal inside the already-risen card */}
              <div className="mt-2 overflow-hidden">
                <h2
                  className="text-xl font-semibold leading-tight text-white/95 sm:text-2xl"
                  style={clipRise(audienceVisible, "0.1s")}
                >
                  {t("landing:hero.seekersHeadline")}
                </h2>
              </div>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-white/60">
                {t("landing:hero.seekersBody")}
              </p>
              <Link
                to="/jobs"
                className="mt-6 inline-block rounded-sm bg-copper px-5 py-2.5 text-center text-sm font-medium text-white transition hover:bg-gold"
              >
                {t("landing:hero.seekersCta")}
              </Link>
            </div>

            {/* Secondary: companies — staggered 0.15s behind */}
            <div
              className="flex flex-col rounded-xl border border-white/8 bg-card p-6 text-start"
              style={cardRise(audienceVisible, "0.15s")}
            >
              <p className="text-[10px] font-semibold uppercase tracking-widest text-copper/60">
                {t("landing:hero.forCompanies")}
              </p>
              <div className="mt-2 overflow-hidden">
                <h2
                  className="text-lg font-semibold leading-tight text-white/90"
                  style={clipRise(audienceVisible, "0.25s")}
                >
                  {t("landing:hero.companiesHeadline")}
                </h2>
              </div>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-white/55">
                {t("landing:hero.companiesBody")}
              </p>
              <p className="mt-3 text-xs text-white/30">
                {t("landing:hero.companiesInviteOnly")}
              </p>
              <a
                href={`mailto:${t("landing:contact.email")}`}
                className="mt-5 inline-block rounded-sm border border-copper/35 px-4 py-2 text-center text-sm text-copper/70 transition hover:border-copper/60 hover:text-copper"
              >
                {t("landing:hero.companiesContactCta")}
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
