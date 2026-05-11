import { useTranslation } from "react-i18next";

/**
 * Copper-accent chip representing a currently-applied filter on an admin
 * list page. The X button removes the filter via `onRemove`.
 */
export default function ActiveFilterChip({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  const { t } = useTranslation();
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-copper/35 bg-copper/12 py-1 ps-3 pe-1 text-xs font-medium text-copper">
      <span className="max-w-[14rem] truncate">{label}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`${t("common.clear")} ${label}`}
        className="inline-flex size-5 shrink-0 items-center justify-center rounded-full text-copper/80 transition hover:bg-copper/20 hover:text-copper"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 16 16"
          fill="currentColor"
          className="size-3"
          aria-hidden="true"
        >
          <path d="M3.28 2.22a.75.75 0 0 0-1.06 1.06L6.94 8l-4.72 4.72a.75.75 0 1 0 1.06 1.06L8 9.06l4.72 4.72a.75.75 0 1 0 1.06-1.06L9.06 8l4.72-4.72a.75.75 0 0 0-1.06-1.06L8 6.94 3.28 2.22Z" />
        </svg>
      </button>
    </span>
  );
}
