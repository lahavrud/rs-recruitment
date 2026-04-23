import { useTranslation } from "react-i18next";

export default function AdminCandidatesPage() {
  const { t } = useTranslation();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">{t("admin.candidates.title")}</h1>
      <p className="mt-1 text-sm text-gray-500">
        {t("admin.candidates.subtitle")}
      </p>
      <div className="mt-8 rounded-lg border border-dashed border-gray-300 p-16 text-center text-gray-400">
        {t("admin.candidates.comingSoon")}
      </div>
    </div>
  );
}
