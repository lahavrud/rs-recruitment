import { useEffect, useRef } from "react";

/**
 * Textarea that auto-grows with its content. Mobile users can't drag the
 * native resize handle, so the box expands as they type instead.
 */
export default function AutoGrowTextarea({
  value,
  onChange,
  className,
  minRows = 4,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  minRows?: number;
  placeholder?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={minRows}
      placeholder={placeholder}
      className={`${className ?? ""} resize-none overflow-hidden`}
    />
  );
}
