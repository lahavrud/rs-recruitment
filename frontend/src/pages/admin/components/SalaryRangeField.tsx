import { useTranslation } from "react-i18next";
import RangeSlider from "@/components/ui/RangeSlider";

const SALARY_FORM_MIN = 0;
const SALARY_FORM_MAX = 60000;
const SALARY_FORM_STEP = 500;

/** Salary range slider + numeric display (replaces two number inputs). */
export default function SalaryRangeField({
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
  const { t } = useTranslation();
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
        ariaLabelMin={t("common.salaryMin")}
        ariaLabelMax={t("common.salaryMax")}
      />
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
