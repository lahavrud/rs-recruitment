import { useTranslation } from "react-i18next";

export default function AdminCandidatesPage() {
  const { t } = useTranslation();

  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-copper">
        {t("admin.candidates.title")}
      </p>
      <div className="mt-3 h-px w-8 bg-copper/40" />
      <p className="mt-4 text-sm text-white/40">{t("admin.candidates.subtitle")}</p>
      <div className="mt-8 rounded-xl border border-dashed border-white/10 p-16 text-center text-sm text-white/25">
        {t("admin.candidates.comingSoon")}
      </div>
    </div>
  );
}
