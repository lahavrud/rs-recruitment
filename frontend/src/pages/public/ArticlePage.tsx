import { Link, useParams } from "react-router-dom";
import SeoHead, { SITE_URL, SITE_NAME } from "@/components/ui/SeoHead";
import { getArticle } from "@/content/articles";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("he-IL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function ArticlePage() {
  const { slug } = useParams<{ slug: string }>();
  const article = slug ? getArticle(slug) : undefined;

  if (!article) {
    return (
      <div className="mx-auto max-w-2xl px-6 pt-24 pb-16">
        <SeoHead
          title="המאמר לא נמצא"
          description="המאמר המבוקש אינו זמין."
          canonical={`${SITE_URL}/articles`}
          noIndex
        />
        <p className="text-sm text-white/55">המאמר לא נמצא.</p>
        <Link
          to="/articles"
          className="mt-6 inline-block text-sm text-copper hover:text-gold"
        >
          ← כל המאמרים
        </Link>
      </div>
    );
  }

  const canonical = `${SITE_URL}/articles/${article.slug}`;
  const articleSchema = {
    "@type": "Article",
    headline: article.title,
    description: article.description,
    datePublished: article.date,
    dateModified: article.date,
    inLanguage: "he-IL",
    mainEntityOfPage: canonical,
    author: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: { "@type": "ImageObject", url: `${SITE_URL}/logo.svg` },
    },
    ...(article.keywords ? { keywords: article.keywords } : {}),
  };
  const breadcrumb = {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: SITE_NAME, item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "מאמרים", item: `${SITE_URL}/articles` },
      { "@type": "ListItem", position: 3, name: article.title, item: canonical },
    ],
  };
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [articleSchema, breadcrumb],
  };

  return (
    <div className="mx-auto max-w-2xl px-6 pt-24 pb-16">
      <SeoHead
        title={article.title}
        description={article.description}
        canonical={canonical}
        ogType="article"
        structuredData={structuredData}
      />

      <Link
        to="/articles"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-white/35 transition hover:text-copper"
      >
        ← כל המאמרים
      </Link>

      <article>
        <header className="mb-8">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-copper/70">
            {formatDate(article.date)}
          </p>
          <h1 className="mt-3 text-2xl font-semibold text-white/95 sm:text-3xl">
            {article.title}
          </h1>
        </header>

        <div
          className="prose-article text-white/75"
          // Markdown is in-repo (not user input). Trusted source.
          dangerouslySetInnerHTML={{ __html: article.bodyHtml }}
        />
      </article>
    </div>
  );
}
