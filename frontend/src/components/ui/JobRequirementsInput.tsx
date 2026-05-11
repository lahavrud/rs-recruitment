import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { inputCls } from "@/styles/forms";
import {
  JOB_REQ_MAX_COUNT,
  JOB_REQ_MIN_COUNT,
  JOB_REQ_TEXT_MAX,
  type JobRequirementItem,
} from "@/types/api";

interface Props {
  value: JobRequirementItem[];
  onChange: (next: JobRequirementItem[]) => void;
  error?: string;
}

const REQUIREMENT_PLACEHOLDER_POOL = [
  "5+ שנות ניסיון בניהול מתקנים",
  "רישיון נהיגה בתוקף",
  "שליטה ב-Excel ובמערכות ERP",
  "ידע במערכות BMS / בקרת בניין",
  "תעודת מיזוג אוויר",
  "ניסיון בניהול צוות של 10+ עובדים",
  "תואר ראשון בהנדסה",
  "הסמכה בבטיחות אש",
  "שליטה בעברית ובערבית ברמת שפת אם",
  "כושר ניהולי גבוה",
  "ניסיון בעבודה מול לקוחות עסקיים",
  "זמינות לכוננות בסופי שבוע",
];

function shuffled<T>(arr: readonly T[]): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export default function JobRequirementsInput({ value, onChange, error }: Props) {
  const { t } = useTranslation();
  const canAdd = value.length < JOB_REQ_MAX_COUNT;
  const canRemove = value.length > 1;
  // Stable per-mount placeholder order so each row gets a distinct example.
  const placeholders = useMemo(() => shuffled(REQUIREMENT_PLACEHOLDER_POOL), []);

  const update = (i: number, text: string) => {
    const next = value.slice();
    next[i] = { text };
    onChange(next);
  };
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));
  const add = () => onChange([...value, { text: "" }]);

  return (
    <div>
      <ul className="space-y-2">
        {value.map((req, i) => (
          <li key={i} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="inline-block size-1.5 shrink-0 rounded-full bg-copper/70"
            />
            <input
              type="text"
              value={req.text}
              onChange={(e) => update(i, e.target.value)}
              maxLength={JOB_REQ_TEXT_MAX}
              placeholder={placeholders[i % placeholders.length]}
              className={inputCls}
            />
            <button
              type="button"
              onClick={() => remove(i)}
              disabled={!canRemove}
              aria-label={t("common.removeRequirement")}
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-sm border border-white/15 text-white/55 transition hover:border-danger/40 hover:text-danger disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-white/15 disabled:hover:text-white/55"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 16 16"
                fill="currentColor"
                className="size-3.5"
                aria-hidden="true"
              >
                <path d="M3 8a.75.75 0 0 1 .75-.75h8.5a.75.75 0 0 1 0 1.5h-8.5A.75.75 0 0 1 3 8Z" />
              </svg>
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={add}
          disabled={!canAdd}
          className="inline-flex items-center gap-1.5 rounded-sm border border-copper/35 px-3 py-1.5 text-xs font-medium text-copper transition hover:border-copper/60 hover:bg-copper/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 16 16"
            fill="currentColor"
            className="size-3.5"
            aria-hidden="true"
          >
            <path d="M8 2.75a.75.75 0 0 1 .75.75v3.75h3.75a.75.75 0 0 1 0 1.5H8.75v3.75a.75.75 0 0 1-1.5 0V8.75H3.5a.75.75 0 0 1 0-1.5h3.75V3.5A.75.75 0 0 1 8 2.75Z" />
          </svg>
          {t("common.addRequirement")}
        </button>
        <span className="text-[11px] text-white/35">
          {t("common.requirementCount", {
            count: value.length,
            min: JOB_REQ_MIN_COUNT,
            max: JOB_REQ_MAX_COUNT,
          })}
        </span>
      </div>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}
