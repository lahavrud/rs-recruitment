import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas">
      <h1 className="text-6xl font-bold text-ink-3">{t("notFound.title")}</h1>
      <p className="mt-4 text-lg text-ink-2">{t("notFound.message")}</p>
      <Link
        to="/"
        className="mt-6 rounded-md bg-copper px-4 py-2 text-sm font-medium text-white hover:bg-gold"
      >
        {t("notFound.goToDashboard")}
      </Link>
    </div>
  );
}
