// ── Field helper ───────────────────────────────────────────────────────────

export default function Field({
  label,
  children,
  full,
  name,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
  name?: string;
}) {
  return (
    <label
      className={`block ${full ? "sm:col-span-2" : ""}`}
      data-field={name}
    >
      <span className="block text-xs text-white/45">{label}</span>
      <span className="mt-1 block">{children}</span>
    </label>
  );
}
