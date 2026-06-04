import { type CSSProperties, useEffect, useRef, useState } from "react";
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

function clipRise(visible: boolean, delay = "0s"): CSSProperties {
  return visible
    ? { animation: `text-clip-rise 0.8s cubic-bezier(0.215, 0.61, 0.355, 1) ${delay} both` }
    : { transform: "translateY(105%)" };
}

export default function LandingSectors() {
  const { t } = useTranslation('landing');
  const [statsRef, statsVisible] = useReveal(0.3);

  return (
    <div className="border-y border-white/6 bg-void py-10 sm:py-12">
      <div className="mx-auto max-w-4xl px-6">
        <div className="overflow-hidden">
          <p
            className="mb-6 text-center text-[10px] font-semibold uppercase tracking-widest text-copper/55"
            style={clipRise(statsVisible, "0s")}
          >
            {t("landing:sectors.eyebrow")}
          </p>
        </div>
        <div ref={statsRef} className="grid grid-cols-3">
          {(
            [
              { titleKey: "landing:sectors.s1Title", subKey: "landing:sectors.s1Sub", i: 0 },
              { titleKey: "landing:sectors.s2Title", subKey: "landing:sectors.s2Sub", i: 1 },
              { titleKey: "landing:sectors.s3Title", subKey: "landing:sectors.s3Sub", i: 2 },
            ] as const
          ).map(({ titleKey, subKey, i }) => (
            <div
              key={titleKey}
              className="border-s border-white/8 px-4 text-center first:border-s-0 first:ps-0 last:pe-0 sm:px-6"
            >
              <div className="overflow-hidden">
                <p
                  className="text-sm font-semibold text-white/80 sm:text-base"
                  style={clipRise(statsVisible, `${i * 0.12}s`)}
                >
                  {t(titleKey)}
                </p>
              </div>
              <div className="overflow-hidden">
                <p
                  className="mt-1.5 text-[11px] leading-snug text-white/30 sm:text-xs"
                  style={clipRise(statsVisible, `${i * 0.12 + 0.08}s`)}
                >
                  {t(subKey)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
