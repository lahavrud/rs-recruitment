import { type CSSProperties, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

function useReveal(threshold = 0.05) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) { setVisible(true); return; }
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold, rootMargin: "0px 0px -60px 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible] as const;
}

function cardRise(visible: boolean, delay = "0s"): CSSProperties {
  return visible
    ? { animation: `card-reveal 0.75s cubic-bezier(0.215, 0.61, 0.355, 1) ${delay} both` }
    : { opacity: 0, transform: "translateY(36px)" };
}

function clipRise(visible: boolean, delay = "0s"): CSSProperties {
  return visible
    ? { animation: `text-clip-rise 0.8s cubic-bezier(0.215, 0.61, 0.355, 1) ${delay} both` }
    : { transform: "translateY(105%)" };
}

export default function LandingAudiencePanels() {
  const { t } = useTranslation();
  const [audienceRef, audienceVisible] = useReveal(0.2);

  return (
    <section className="relative py-10 sm:py-14">
      {/* Front-loaded fade: void/55 → nearly dark by 35% → locked card-raised after that */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `linear-gradient(to bottom,
            color-mix(in srgb, var(--color-void) 55%, transparent) 0%,
            color-mix(in srgb, var(--color-void) 75%, transparent) 15%,
            color-mix(in srgb, var(--color-void) 92%, transparent) 28%,
            var(--color-card-raised) 38%
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
              {t("landing.hero.forSeekers")}
            </p>
            {/* Heading clip-reveal inside the already-risen card */}
            <div className="mt-2 overflow-hidden">
              <h2
                className="text-xl font-semibold leading-tight text-white/95 sm:text-2xl"
                style={clipRise(audienceVisible, "0.1s")}
              >
                {t("landing.hero.seekersHeadline")}
              </h2>
            </div>
            <p className="mt-3 flex-1 text-sm leading-relaxed text-white/60">
              {t("landing.hero.seekersBody")}
            </p>
            <Link
              to="/jobs"
              className="mt-6 inline-block rounded-sm bg-copper px-5 py-2.5 text-center text-sm font-medium text-white transition hover:bg-gold"
            >
              {t("landing.hero.seekersCta")}
            </Link>
          </div>

          {/* Secondary: companies — staggered 0.15s behind */}
          <div
            className="flex flex-col rounded-xl border border-white/8 bg-card p-6 text-start"
            style={cardRise(audienceVisible, "0.15s")}
          >
            <p className="text-[10px] font-semibold uppercase tracking-widest text-copper/60">
              {t("landing.hero.forCompanies")}
            </p>
            <div className="mt-2 overflow-hidden">
              <h2
                className="text-lg font-semibold leading-tight text-white/90"
                style={clipRise(audienceVisible, "0.25s")}
              >
                {t("landing.hero.companiesHeadline")}
              </h2>
            </div>
            <p className="mt-3 flex-1 text-sm leading-relaxed text-white/55">
              {t("landing.hero.companiesBody")}
            </p>
            <p className="mt-3 text-xs text-white/30">
              {t("landing.hero.companiesInviteOnly")}
            </p>
            <a
              href={`mailto:${t("landing.contact.email")}`}
              className="mt-5 inline-block rounded-sm border border-copper/35 px-4 py-2 text-center text-sm text-copper/70 transition hover:border-copper/60 hover:text-copper"
            >
              {t("landing.hero.companiesContactCta")}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
