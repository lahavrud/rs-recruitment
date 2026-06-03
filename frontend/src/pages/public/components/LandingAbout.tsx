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

export default function LandingAbout() {
  const { t } = useTranslation('landing');
  const [aboutTextRef, aboutTextVisible] = useReveal(0.2);
  const [aboutImgLoaded, setAboutImgLoaded] = useState(false);
  const [cardsVisible, setCardsVisible] = useState<boolean>(
    () => typeof window === "undefined" || !("IntersectionObserver" in window),
  );
  const cardsRef = useRef<HTMLDivElement>(null);

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

  return (
    <section className="texture-wave bg-card-raised py-20 sm:py-32">
      <div className="mx-auto max-w-4xl px-6">

        {/*
          Split layout: text on the visual right (reading start in RTL),
          photo on the visual left.
          RTL grid: first DOM child → rightmost visually.
        */}
        <div ref={aboutTextRef} className="grid items-center gap-10 sm:grid-cols-2 sm:gap-14">
          {/* Text column — clip-rise on headline, card-rise on body */}
          <div>
            <div className="h-px w-8 bg-copper/40" style={aboutTextVisible ? { animation: "line-expand-h 0.6s cubic-bezier(0.215,0.61,0.355,1) both", transformOrigin: "right" } : { transform: "scaleX(0)" }} />
            <div className="overflow-hidden">
              <p className="mt-3 text-xs font-semibold uppercase tracking-widest text-copper" style={clipRise(aboutTextVisible, "0.05s")}>
                {t("landing:about.eyebrow")}
              </p>
            </div>
            <div className="mt-5 overflow-hidden">
              <h2 className="text-xl font-semibold leading-snug text-white/90 sm:text-2xl" style={clipRise(aboutTextVisible, "0.15s")}>
                {t("landing:about.headline")}
              </h2>
            </div>
            <p className="mt-5 text-base leading-relaxed text-white/60" style={cardRise(aboutTextVisible, "0.28s")}>
              <span className="font-wordmark text-3xl font-light tracking-widest text-gold/60 sm:text-4xl">RS Recruiting</span>{" "}
              {t("landing:about.body")}
            </p>
            <p className="mt-4 text-sm leading-relaxed text-white/50" style={cardRise(aboutTextVisible, "0.38s")}>
              {t("landing:about.body2")}
            </p>
            <p className="mt-8 text-xs uppercase tracking-widest text-white/25" style={cardRise(aboutTextVisible, "0.48s")}>
              {t("landing:about.pillars")}
            </p>
            <Link
              to="/about"
              className="mt-6 inline-block text-sm text-copper/70 transition hover:text-copper"
              style={cardRise(aboutTextVisible, "0.56s")}
            >
              {t("landing:about.learnMore")} ←
            </Link>
          </div>

          {/* Photo — clip-path wipe reveal (no overlay, no corner bleeding).
              Clip starts at inset(0 0 0 100%) — fully hidden from right edge.
              Animates to inset(0 0 0 0%) — fully revealed, right to left.    */}
          <div className="overflow-hidden rounded-xl">
            <picture>
              <source type="image/webp" srcSet="/landing-about.webp" />
              <img
                src="/landing-about.jpg"
                alt=""
                aria-hidden="true"
                onLoad={() => setAboutImgLoaded(true)}
                className="aspect-[4/5] w-full object-cover object-center"
                style={
                  aboutTextVisible && aboutImgLoaded
                    ? { animation: "clip-wipe-reveal 1.1s cubic-bezier(0.76, 0, 0.24, 1) 0.08s both" }
                    : { clipPath: "inset(0 0 0 100% round 0.75rem)" }
                }
              />
            </picture>
          </div>
        </div>

        {/* Feature cards — below the split, full width */}
        <div
          ref={cardsRef}
          className="mt-12 -mx-6 flex gap-4 overflow-x-auto px-6 pb-4 sm:mx-0 sm:mt-16 sm:grid sm:grid-cols-3 sm:gap-5 sm:overflow-visible sm:px-0 sm:pb-0"
        >
          {(
            [
              { titleKey: "landing:about.feature1Title", bodyKey: "landing:about.feature1Body", num: "01" },
              { titleKey: "landing:about.feature2Title", bodyKey: "landing:about.feature2Body", num: "02" },
              { titleKey: "landing:about.feature3Title", bodyKey: "landing:about.feature3Body", num: "03" },
            ] as const
          ).map((f, idx) => (
            <div
              key={f.titleKey}
              className="w-[78vw] shrink-0 snap-start sm:w-auto"
              style={{
                animation: cardsVisible
                  ? `${["card-tilt-in", "card-rise-in", "card-swing-in"][idx]} 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) ${idx * 160}ms both`
                  : "none",
                opacity: cardsVisible ? undefined : 0,
              }}
            >
              <div className="feature-card feature-card-shimmer h-full rounded-lg border border-white/10 bg-card-raised p-6">
                <p className="select-none text-4xl font-semibold leading-none text-copper/25">{f.num}</p>
                <div
                  className="mt-4 h-px bg-copper/60 transition-all duration-500"
                  style={{
                    width: cardsVisible ? "1.5rem" : "0",
                    transitionDelay: cardsVisible ? `${idx * 160 + 380}ms` : "0ms",
                  }}
                />
                <p className="mt-3 font-semibold text-white/90">{t(f.titleKey)}</p>
                <p className="mt-2 text-sm leading-relaxed text-white/55">{t(f.bodyKey)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
