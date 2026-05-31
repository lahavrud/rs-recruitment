import { useTranslation } from "react-i18next";

/** Featured-toggle as a star button. Click opens a confirm dialog in the parent. */
export default function FeaturedStarButton({
  active,
  onToggleRequest,
}: {
  active: boolean;
  onToggleRequest: () => void;
}) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={onToggleRequest}
      aria-pressed={active}
      aria-label={t("admin.jobs.fields.featuredToggleAria")}
      title={t(active ? "admin.jobs.featuredOnHint" : "admin.jobs.featuredOffHint")}
      className={`inline-flex size-10 shrink-0 items-center justify-center rounded-sm border transition duration-200 active:scale-90 ${
        active
          ? "border-gold/60 bg-gold/15 text-gold hover:bg-gold/25"
          : "border-white/15 text-white/40 hover:border-gold/40 hover:text-gold/80"
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
        className="size-5"
        aria-hidden="true"
      >
        <path d="M12 2.5l3.09 6.26 6.91 1.01-5 4.87 1.18 6.88L12 18.27l-6.18 3.25L7 14.64 2 9.77l6.91-1.01L12 2.5z" />
      </svg>
    </button>
  );
}
