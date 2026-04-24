import { useTranslation } from "react-i18next";

export default function AdminCandidatesPage() {
  const { t } = useTranslation();

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">{t("admin.candidates.title")}</h1>
      <p className="mt-1 text-sm text-ink-2">
        {t("admin.candidates.subtitle")}
      </p>
      <div className="mt-8 rounded-lg border border-dashed border-line-2 p-16 text-center text-ink-3">
        {t("admin.candidates.comingSoon")}
      </div>
    </div>
  );
}
