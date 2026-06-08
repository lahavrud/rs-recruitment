import { useMemo, useRef, useState, type KeyboardEvent } from "react";
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
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useTranslation } from "react-i18next";
import { inputCls } from "@/styles/forms";
import { JOB_TAG_MAX_COUNT, JOB_TAG_MAX_LEN } from "@/types/api";

const TAG_EDIT_MIN_CHARS = 4;

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

// ── Sortable pill ─────────────────────────────────────────────────────────────

function SortableTag({
  tag,
  onRemove,
  onEdit,
}: {
  tag: string;
  onRemove: () => void;
  onEdit: (next: string) => void;
}) {
  const { t } = useTranslation(['common']);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(tag);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tag });

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== tag) {
      onEdit(trimmed);
    } else {
      setDraft(tag);
    }
    setEditing(false);
  };

  const startEdit = () => {
    setDraft(tag);
    setEditing(true);
  };

  return (
    <span
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`inline-flex items-center gap-1 rounded-full border py-1 text-xs font-medium text-copper ${
        isDragging ? "z-50 opacity-50" : ""
      } ${editing ? "border-copper/50 bg-copper/18 pe-1.5" : "border-copper/35 bg-copper/12 pe-1"}`}
    >
      {/* Grip handle — hidden while editing to prevent accidental drag */}
      {!editing && (
        <span
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label={t("common:dragHandle")}
          role="button"
          tabIndex={0}
          className="inline-flex size-5 cursor-grab items-center justify-center rounded-full ps-1 text-copper/40 transition hover:text-copper/70 active:cursor-grabbing touch-none"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 16 16"
            fill="currentColor"
            className="size-3"
            aria-hidden="true"
          >
            <path d="M5.5 3.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM5.5 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM5.5 12.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM12.5 3.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM12.5 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM12.5 12.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z" />
          </svg>
        </span>
      )}

      {editing ? (
        <input
          ref={inputRef}
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); }
            if (e.key === "Escape") { setDraft(tag); setEditing(false); }
          }}
          maxLength={JOB_TAG_MAX_LEN}
          className="inline-block bg-transparent text-copper outline-none ps-1.5"
          style={{ width: `${Math.max(draft.length + 1, TAG_EDIT_MIN_CHARS)}ch` }}
        />
      ) : (
        <button
          type="button"
          onClick={startEdit}
          title={t("common:editTag")}
          className="text-copper hover:text-copper/80 focus:outline-none focus-visible:underline"
        >
          {tag}
        </button>
      )}

      <button
        type="button"
        onClick={onRemove}
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
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function JobTagsInput({ value, onChange, error }: Props) {
  const { t } = useTranslation(['common', 'http']);
  const [draft, setDraft] = useState("");
  const canAdd = value.length < JOB_TAG_MAX_COUNT;
  // Stable per-mount placeholder so the empty input shows a fresh hint each open.
  const placeholder = useMemo(() => pickRandom(TAG_PLACEHOLDER_POOL), []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const oldIndex = value.indexOf(active.id as string);
    const newIndex = value.indexOf(over.id as string);
    onChange(arrayMove(value, oldIndex, newIndex));
  }

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

  const edit = (oldTag: string, newTag: string) => {
    if (value.some((t) => t.toLowerCase() === newTag.toLowerCase() && t !== oldTag)) return;
    onChange(value.map((t) => (t === oldTag ? newTag : t)));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commit();
    }
  };

  return (
    <div>
      {value.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={value} strategy={rectSortingStrategy}>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {value.map((tag) => (
                <SortableTag
                  key={tag}
                  tag={tag}
                  onRemove={() => remove(tag)}
                  onEdit={(next) => edit(tag, next)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
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
          onMouseDown={(e) => e.preventDefault()}
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
