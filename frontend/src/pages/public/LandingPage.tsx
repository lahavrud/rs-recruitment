import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import SeoHead, { SITE_URL } from "@/components/ui/SeoHead";
import LandingHero from "./components/LandingHero";
import LandingSectors from "./components/LandingSectors";
import LandingAbout from "./components/LandingAbout";
import LandingFeaturedJobs from "./components/LandingFeaturedJobs";

// Combined Organization + WebSite schema via @graph. WebSite gives Google a
// canonical brand entity for the domain (helps consolidate the homepage and
// /jobs into a single SERP result with sitelinks instead of two separate
// entries). EmploymentAgency is a more specific Organization subtype that
// matches the niche.
const SITE_SCHEMA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": ["Organization", "EmploymentAgency"],
      "@id": `${SITE_URL}/#organization`,
      name: "RS Recruiting",
      url: SITE_URL,
      logo: `${SITE_URL}/logo.svg`,
      description:
        "משרד גיוס והשמה בוטיקי המתמחה בגיוס לתפקידי ניהול ותפעול מבנים ונכסים בישראל",
      areaServed: "IL",
      knowsAbout: [
        "ניהול מבנים",
        "תפעול מבנים",
        "ניהול נכסים",
        "גיוס עובדים",
        "השמה",
      ],
      contactPoint: {
        "@type": "ContactPoint",
        email: "support@rs-recruiting.com",
        contactType: "כוח אדם וגיוס",
        areaServed: "IL",
        availableLanguage: "Hebrew",
      },
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: "RS Recruiting",
      inLanguage: "he-IL",
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
  ],
};

export default function LandingPage() {
  const { t } = useTranslation(['https', 'landing']);
  useAuth(); // keeps auth context initialised for child components
  const navigate = useNavigate();

  const audienceRef = useRef<HTMLDivElement>(null);
  const [audienceVisible, setAudienceVisible] = useState(false);
  const [heroLoaded, setHeroLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Audience panels visibility via IntersectionObserver
  useEffect(() => {
    const el = audienceRef.current;
    if (!el || !("IntersectionObserver" in window)) { setAudienceVisible(true); return; }
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setAudienceVisible(true); obs.disconnect(); } },
      { threshold: 0.2, rootMargin: "0px 0px -60px 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    navigate(`/jobs${searchQuery.trim() ? `?q=${encodeURIComponent(searchQuery.trim())}` : ""}`);
  }

  return (
    <div className="bg-page">
      <SeoHead
        title={t("landing:seo.title")}
        description={t("landing:seo.description")}
        canonical={SITE_URL}
        ogImage={`${SITE_URL}/og/home.svg`}
        structuredData={SITE_SCHEMA}
      />

      {/* ── Hero + audience panels share one image so they fade into each
            other without a visible seam where the sections meet. ─────────── */}
      <div className="relative overflow-hidden bg-void">
        <picture>
          <source type="image/webp" srcSet="/hero-city.webp" />
          <img
            src="/hero-city.jpg"
            alt=""
            aria-hidden="true"
            onLoad={() => setHeroLoaded(true)}
            className="pointer-events-none absolute inset-0 h-full w-full object-cover transition-opacity duration-[900ms] ease-out"
            style={{
              objectPosition: "center 60%",
              opacity: heroLoaded ? 1 : 0,
            }}
          />
        </picture>

        <LandingHero
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSearchSubmit={handleSearch}
          audienceVisible={audienceVisible}
          audienceRef={audienceRef}
        />
      </div>

      <LandingSectors />

      <LandingAbout />

      <LandingFeaturedJobs />
    </div>
  );
}
