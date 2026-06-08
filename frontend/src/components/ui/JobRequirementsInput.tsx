import { useMemo, useRef, useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useTranslation } from "react-i18next";
import { ghostInputCls } from "@/styles/forms";
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

// ── Sortable row ─────────────────────────────────────────────────────────────
// Grip handle activates drag. Click the text → inline edit.

interface ReqItemProps {
  id: number;
  req: JobRequirementItem;
  index: number;
  placeholder: string;
  canRemove: boolean;
  /** True only for items just added via the + button — opens the field immediately. */
  startInEditMode: boolean;
  onUpdate: (index: number, text: string) => void;
  onRemove: (index: number) => void;
}

function SortableReqItem({
  req,
  index,
  placeholder,
  canRemove,
  startInEditMode,
  onUpdate,
  onRemove,
  id,
}: ReqItemProps) {
  const { t } = useTranslation(["common"]);
  const [editing, setEditing] = useState(startInEditMode);
  const [draft, setDraft] = useState(req.text);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const commit = () => {
    onUpdate(index, draft.trim());
    setEditing(false);
  };

  const startEdit = () => {
    setDraft(req.text);
    setEditing(true);
  };

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`group flex items-center gap-2 py-0.5 ${isDragging ? "relative z-50 opacity-50" : ""}`}
    >
      {/* Grip drag handle */}
      <span
        {...attributes}
        {...listeners}
        aria-label={t("common:dragHandle")}
        className="shrink-0 cursor-grab opacity-0 transition-opacity group-hover:opacity-60 active:cursor-grabbing"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 16 16"
          fill="currentColor"
          className="size-3.5 text-white/50"
          aria-hidden="true"
        >
          <circle cx="5" cy="3.5" r="1" />
          <circle cx="5" cy="8" r="1" />
          <circle cx="5" cy="12.5" r="1" />
          <circle cx="11" cy="3.5" r="1" />
          <circle cx="11" cy="8" r="1" />
          <circle cx="11" cy="12.5" r="1" />
        </svg>
      </span>

      {/* Copper bullet */}
      <span aria-hidden="true" className="inline-block size-1.5 shrink-0 rounded-full bg-copper/60" />

      {editing ? (
        <input
          type="text"
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); }
            if (e.key === "Escape") { setDraft(req.text); setEditing(false); }
          }}
          maxLength={JOB_REQ_TEXT_MAX}
          placeholder={placeholder}
          className={`${ghostInputCls} flex-1`}
        />
      ) : (
        <span
          onClick={startEdit}
          className="flex-1 cursor-pointer select-none text-sm leading-relaxed"
        >
          {req.text ? (
            <span className="text-white/80 transition-colors hover:text-white/95">{req.text}</span>
          ) : (
            <span className="italic text-white/25">{placeholder}</span>
          )}
        </span>
      )}

      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => onRemove(index)}
        disabled={!canRemove}
        aria-label={t("common:removeRequirement")}
        className="inline-flex size-6 shrink-0 items-center justify-center rounded-sm text-white/25 opacity-0 transition group-hover:opacity-100 hover:text-danger/70 disabled:cursor-not-allowed disabled:hover:text-white/25"
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
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function JobRequirementsInput({ value, onChange, error }: Props) {
  const { t } = useTranslation(["common"]);
  const canAdd = value.length < JOB_REQ_MAX_COUNT;
  const canRemove = value.length > 1;
  const placeholders = useMemo(() => shuffled(REQUIREMENT_PLACEHOLDER_POOL), []);

  const nextId = useRef(value.length);
  const [ids, setIds] = useState<number[]>(() => value.map((_, i) => i));
  // Tracks which numeric ID (if any) should open in edit mode immediately on mount.
  const [pendingFocusId, setPendingFocusId] = useState<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const oldIndex = ids.indexOf(active.id as number);
    const newIndex = ids.indexOf(over.id as number);
    setIds((prev) => arrayMove(prev, oldIndex, newIndex));
    onChange(arrayMove(value, oldIndex, newIndex));
  }

  const update = (i: number, text: string) => {
    const next = value.slice();
    next[i] = { text };
    onChange(next);
  };

  const remove = (i: number) => {
    setIds((prev) => prev.filter((_, idx) => idx !== i));
    onChange(value.filter((_, idx) => idx !== i));
  };

  const add = () => {
    const newId = nextId.current++;
    setPendingFocusId(newId);
    setIds((prev) => [...prev, newId]);
    onChange([...value, { text: "" }]);
  };

  return (
    <div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <ul className="space-y-0.5">
            {value.map((req, i) => (
              <SortableReqItem
                key={ids[i]}
                id={ids[i]}
                req={req}
                index={i}
                placeholder={placeholders[i % placeholders.length]}
                canRemove={canRemove}
                startInEditMode={ids[i] === pendingFocusId}
                onUpdate={update}
                onRemove={remove}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      <div className="mt-2 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={add}
          disabled={!canAdd}
          className="flex items-center gap-1.5 text-sm text-copper/70 transition hover:text-copper disabled:cursor-not-allowed disabled:opacity-30"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 16 16"
            fill="currentColor"
            className="size-3"
            aria-hidden="true"
          >
            <path d="M8 2.75a.75.75 0 0 1 .75.75v3.75h3.75a.75.75 0 0 1 0 1.5H8.75v3.75a.75.75 0 0 1-1.5 0V8.75H3.5a.75.75 0 0 1 0-1.5h3.75V3.5A.75.75 0 0 1 8 2.75Z" />
          </svg>
          {t("common:addRequirement")}
        </button>
        <span className="text-[11px] text-white/25">
          {t("common:requirementCount", {
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
