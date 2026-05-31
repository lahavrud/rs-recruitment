import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { JobRead } from "@/types/api";
import { JobDetailBody } from "./DetailJobDialog";

/**
 * Mobile card with controlled expand/collapse. A dedicated chevron column at
 * the inline-start of the summary row makes the affordance unmissable, the
 * border tints copper when open, and a "סגור" button anchors the bottom of
 * the expanded content so the user can always close without scrolling back up.
 *
 * The expand/collapse uses the grid-template-rows 0fr→1fr trick so the height
 * animates smoothly without us having to measure the content.
 */
export default function MobileJobCard({
  job,
  statusLabels,
  statusColors,
  companyName,
  actions,
}: {
  job: JobRead;
  statusLabels: Record<string, string>;
  statusColors: Record<string, string>;
  companyName?: string;
  actions: React.ReactNode;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <div
      className={`relative overflow-hidden rounded-xl border bg-card transition-colors duration-200 ${
        open ? "border-copper/40 bg-card-raised" : "border-white/8 hover:border-white/15"
      }`}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={open ? t("admin.jobs.collapseLabel") : t("admin.jobs.expandLabel")}
        className="flex w-full cursor-pointer items-center gap-3 px-3 py-3 pe-12 text-start active:scale-[0.99]"
      >
        <span
          className={`inline-flex size-7 shrink-0 items-center justify-center rounded-full border transition-colors duration-200 ${
            job.is_featured
              ? open
                ? "border-gold bg-gold/25 text-gold"
                : "border-gold/50 bg-gold/10 text-gold"
              : open
                ? "border-copper bg-copper/15 text-copper"
                : "border-white/15 text-white/45"
          }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 16 16"
            fill="currentColor"
            className={`size-3.5 transition-transform duration-300 ease-out ${open ? "rotate-180" : ""}`}
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M4.22 5.72a.75.75 0 0 1 1.06 0L8 8.44l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 6.78a.75.75 0 0 1 0-1.06Z"
              clipRule="evenodd"
            />
          </svg>
        </span>
        <p className="min-w-0 flex-1 truncate font-medium text-white/85">
          {job.title}
        </p>
        <span
          className={`shrink-0 inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium ${statusColors[job.status]}`}
        >
          {statusLabels[job.status]}
        </span>
      </button>
      <div className="absolute end-1 top-2">{actions}</div>
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div
            className={`border-t border-white/8 px-4 py-4 transition-opacity duration-200 ${
              open ? "opacity-100 delay-100" : "opacity-0"
            }`}
          >
            <JobDetailBody
              job={job}
              statusLabels={statusLabels}
              statusColors={statusColors}
              companyName={companyName}
            />
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-sm border border-white/15 px-3 py-2 text-xs font-medium text-white/65 transition-colors hover:border-copper/50 hover:text-copper active:scale-[0.99]"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 16 16"
                fill="currentColor"
                className="size-3.5"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M11.78 10.28a.75.75 0 0 1-1.06 0L8 7.56l-2.72 2.72a.75.75 0 1 1-1.06-1.06l3.25-3.25a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06Z"
                  clipRule="evenodd"
                />
              </svg>
              {t("admin.jobs.collapseLabel")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
