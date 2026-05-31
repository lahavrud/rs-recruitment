import type { CandidateMeRead } from "@/services/candidate";

/**
 * Returns 0–100 (rounded) for the autofill-fields completion percentage,
 * or null while the profile is still loading. full_name + email are
 * mandatory identity (always present) so they don't count toward this
 * score — the value measures how rich the apply-form autofill will be.
 */
export function profileCompletionPercent(
  me: CandidateMeRead | null,
): number | null {
  if (me === null) return null;
  const slots = [me.phone, me.linkedin_url, me.resume_path];
  const filled = slots.filter((s) => !!s).length;
  return Math.round((filled / slots.length) * 100);
}
