/** Formats a monthly salary range for display, e.g. "12,000–15,000 ₪/חודש".
 *  Returns null when neither bound is set (caller decides the fallback). */
export function formatSalary(min: number | null, max: number | null): string | null {
  if (min == null && max == null) return null;
  const fmt = (n: number) => n.toLocaleString("he-IL");
  if (min != null && max != null) return `${fmt(min)}–${fmt(max)} ₪/חודש`;
  if (min != null) return `מ-${fmt(min)} ₪/חודש`;
  if (max != null) return `עד ${fmt(max)} ₪/חודש`;
  return null;
}
