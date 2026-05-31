import { useTranslation } from "react-i18next";

/**
 * Tiny diagonal sash anchored to the top-right corner of a desktop title
 * cell. Sits z-above the text so the title doesn't push it out, and small
 * enough that it doesn't visually overlap the title.
 */
export default function FeaturedDesktopSash() {
  const { t } = useTranslation();
  return (
    <span
      className="pointer-events-none absolute right-0 top-0 z-20 h-7 w-7 overflow-hidden"
      aria-label={t("publicJobs.board.featured")}
    >
      <span
        className="absolute top-1 -right-3 inline-flex w-12 origin-center rotate-45 items-center justify-center bg-gradient-to-r from-copper via-gold to-gold-light py-px text-white shadow-[0_1px_2px_rgba(0,0,0,0.5)]"
      >
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className="size-2.5"
          aria-hidden="true"
        >
          <path d="M12 2.5l3.09 6.26 6.91 1.01-5 4.87 1.18 6.88L12 18.27l-6.18 3.25L7 14.64 2 9.77l6.91-1.01L12 2.5z" />
        </svg>
      </span>
    </span>
  );
}
