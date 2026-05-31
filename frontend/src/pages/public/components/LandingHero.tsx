import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LogoBanner from "@/components/ui/LogoBanner";

const SEARCH_TAGS = ["תפקיד", "מיקום"] as const;

export default function LandingHero() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    navigate(`/jobs${searchQuery.trim() ? `?q=${encodeURIComponent(searchQuery.trim())}` : ""}`);
  }

  return (
    <section className="texture-wave relative flex min-h-screen flex-col">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-void/90 via-page/75 to-void/70" />

      {/* Centered content */}
      <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-6 pb-16 text-center sm:pb-24">
        <LogoBanner />
        <h1 className="sr-only">{t("landing.seo.h1")}</h1>

        <div
          className="mx-auto mt-7 h-px w-32 sm:mt-8 sm:w-48"
          style={{
            background:
              "linear-gradient(to right, transparent, var(--color-copper), var(--color-gold), var(--color-copper), transparent)",
          }}
        />

        <p className="mt-5 text-base font-light tracking-wide text-white/72 sm:mt-6 sm:text-lg">
          {t("landing.hero.tagline")}
        </p>

        {/* Search bar */}
        <form onSubmit={handleSearch} className="mt-9 w-full sm:mt-11">
          <div className="flex items-center overflow-hidden rounded-full border border-white/20 bg-black/45 shadow-xl backdrop-blur-md transition-colors focus-within:border-copper/50">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("landing.hero.searchPlaceholder")}
              className="min-w-0 flex-1 bg-transparent py-4 pe-4 ps-6 text-base text-white/90 placeholder:text-white/35 focus:outline-none sm:text-lg"
            />
            <button
              type="submit"
              aria-label={t("common.search")}
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
  );
}
