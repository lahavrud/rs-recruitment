import { useMemo, useState, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import { inputCls } from "@/styles/forms";
import { JOB_TAG_MAX_COUNT, JOB_TAG_MAX_LEN } from "@/types/api";

interface Props {
  value: string[];
  onChange: (next: string[]) => void;
  error?: string;
}

const TAG_PLACEHOLDER_POOL = [
  "רכב צמוד",
  "טלפון נייד",
  "ארוחות",
  "קרן השתלמות",
  "ניהול בכיר",
  "תפקיד שטח",
  "BMS",
  "כוננות",
  "משמרות",
  "RFID",
  "סביבה",
  "חברה ציבורית",
];

function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export default function JobTagsInput({ value, onChange, error }: Props) {
  const { t } = useTranslation(['common', 'http']);
  const [draft, setDraft] = useState("");
  const canAdd = value.length < JOB_TAG_MAX_COUNT;
  // Stable per-mount placeholder so the empty input shows a fresh hint each open.
  const placeholder = useMemo(() => pickRandom(TAG_PLACEHOLDER_POOL), []);

  const commit = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    if (trimmed.length > JOB_TAG_MAX_LEN) return;
    if (value.some((t) => t.toLowerCase() === trimmed.toLowerCase())) {
      setDraft("");
      return;
    }
    if (!canAdd) return;
    onChange([...value, trimmed]);
    setDraft("");
  };

  const remove = (tag: string) => onChange(value.filter((t) => t !== tag));

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commit();
    }
  };

  return (
    <div>
      {value.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {value.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full border border-copper/35 bg-copper/12 py-1 ps-3 pe-1 text-xs font-medium text-copper"
            >
              {tag}
              <button
                type="button"
                onClick={() => remove(tag)}
                aria-label={`${t("common:removeTag")} ${tag}`}
                className="inline-flex size-5 items-center justify-center rounded-full text-copper/80 transition hover:bg-copper/20 hover:text-copper"
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
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={commit}
          maxLength={JOB_TAG_MAX_LEN}
          placeholder={placeholder}
          disabled={!canAdd}
          className={inputCls}
        />
        <button
          type="button"
          onClick={commit}
          disabled={!canAdd || !draft.trim()}
          className="shrink-0 rounded-sm border border-copper/35 px-3 py-1.5 text-xs font-medium text-copper transition hover:border-copper/60 hover:bg-copper/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {t("common:addTag")}
        </button>
      </div>
      <p className="mt-1 text-[11px] text-white/35">
        {t("common:tagHint", { max: JOB_TAG_MAX_COUNT })}
      </p>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}
