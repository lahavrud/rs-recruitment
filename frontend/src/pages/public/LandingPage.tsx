import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import SeoHead, { SITE_URL } from "@/components/ui/SeoHead";
import LandingHero from "./components/LandingHero";
import LandingAudiencePanels from "./components/LandingAudiencePanels";
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
  const { t } = useTranslation();
  useAuth(); // keeps auth context initialised for child components
  const [heroLoaded, setHeroLoaded] = useState(false);

  return (
    <div className="bg-page">
      <SeoHead
        title={t("landing.seo.title")}
        description={t("landing.seo.description")}
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

        <LandingHero />
        <LandingAudiencePanels />
      </div>

      <LandingSectors />
      <LandingAbout />
      <LandingFeaturedJobs />
    </div>
  );
}
