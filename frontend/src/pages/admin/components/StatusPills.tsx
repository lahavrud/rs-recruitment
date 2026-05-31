import { useTranslation } from "react-i18next";
import { JobStatus } from "@/types/api";

const ALL_STATUSES = [
  JobStatus.PENDING_APPROVAL,
  JobStatus.PUBLISHED,
  JobStatus.CLOSED,
];

/** Status as segmented pills (replaces the dropdown). */
export default function StatusPills({
  value,
  onChange,
}: {
  value: JobStatus;
  onChange: (s: JobStatus) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="mt-1 flex flex-wrap gap-1.5">
      {ALL_STATUSES.map((s) => {
        const active = value === s;
        return (
          <button
            key={s}
            type="button"
            onClick={() => onChange(s)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              active
                ? "bg-copper text-white"
                : "border border-white/15 text-white/55 hover:border-white/30 hover:text-white/85"
            }`}
          >
            {t(`admin.jobs.statusLabels.${s}`)}
          </button>
        );
      })}
    </div>
  );
}
