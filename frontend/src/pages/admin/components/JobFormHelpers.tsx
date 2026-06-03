import { useTranslation } from "react-i18next";
import { JobStatus } from "@/types/api";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import FilterPill from "@/components/ui/FilterPill";
import RangeSlider from "@/components/ui/RangeSlider";

const ALL_STATUSES = [
  JobStatus.PENDING_APPROVAL,
  JobStatus.PUBLISHED,
  JobStatus.CLOSED,
];

const SALARY_FORM_MIN = 0;
const SALARY_FORM_MAX = 60000;
const SALARY_FORM_STEP = 500;

export { default as Field } from "@/components/ui/Field";

/** Featured-toggle as a star button. Click opens a confirm dialog in the parent. */
export function FeaturedStarButton({
  active,
  onToggleRequest,
}: {
  active: boolean;
  onToggleRequest: () => void;
}) {
  const { t } = useTranslation(['admin', 'common']);
  return (
    <button
      type="button"
      onClick={onToggleRequest}
      aria-pressed={active}
      aria-label={t("admin:jobs.fields.featuredToggleAria")}
      title={t(active ? "admin:jobs.featuredOnHint" : "admin:jobs.featuredOffHint")}
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

/** Status as segmented pills (replaces the dropdown). */
export function StatusPills({
  value,
  onChange,
}: {
  value: JobStatus;
  onChange: (s: JobStatus) => void;
}) {
  const { t } = useTranslation(['admin', 'common']);
  return (
    <div className="mt-1 flex flex-wrap gap-1.5">
      {ALL_STATUSES.map((s) => (
        <FilterPill key={s} active={value === s} onClick={() => onChange(s)}>
          {t(`admin:jobs.statusLabels.${s}`)}
        </FilterPill>
      ))}
    </div>
  );
}

/**
 * Confirm dialog for flipping a job's `is_featured` flag. Shared between
 * Create and Edit since copy + behavior are identical.
 */
export function FeaturedConfirmDialog({
  open,
  active,
  onConfirm,
  onClose,
}: {
  open: boolean;
  active: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation(['admin', 'common']);
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={
        active
          ? t("admin:jobs.featuredUnsetTitle")
          : t("admin:jobs.featuredSetTitle")
      }
      message={
        active
          ? t("admin:jobs.featuredUnsetMessage")
          : t("admin:jobs.featuredSetMessage")
      }
      confirmLabel={t("common:confirm")}
      onConfirm={onConfirm}
    />
  );
}

/** Salary range slider + numeric display (replaces two number inputs). */
export function SalaryRangeField({
  min,
  max,
  onChange,
  error,
}: {
  min?: number;
  max?: number;
  onChange: (lo: number, hi: number) => void;
  error?: string;
}) {
  const { t } = useTranslation(['admin', 'common']);
  const lo = Math.max(SALARY_FORM_MIN, Math.min(min ?? SALARY_FORM_MIN, SALARY_FORM_MAX));
  const hi = Math.max(
    Math.min(SALARY_FORM_MAX, Math.max(max ?? SALARY_FORM_MAX, SALARY_FORM_MIN)),
    lo,
  );
  return (
    <div className="mt-1 space-y-3 rounded-md border border-white/8 bg-well/40 px-3 pb-3 pt-2.5">
      <p className="text-sm font-medium text-copper/85">
        {lo.toLocaleString("he-IL")}–{hi.toLocaleString("he-IL")} ₪/חודש
      </p>
      <RangeSlider
        min={SALARY_FORM_MIN}
        max={SALARY_FORM_MAX}
        step={SALARY_FORM_STEP}
        value={[lo, hi]}
        onChange={([newLo, newHi]) => onChange(newLo, newHi)}
        formatValue={(n) => `${n.toLocaleString("he-IL")} ₪`}
        ariaLabelMin={t("common:salaryMin")}
        ariaLabelMax={t("common:salaryMax")}
      />
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
