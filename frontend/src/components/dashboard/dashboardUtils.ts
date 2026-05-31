import type { CandidateMeRead } from "@/services/candidate";

export function profileCompletionPercent(me: CandidateMeRead | null): number | null {
  if (me === null) return null;
  const slots = [me.phone, me.linkedin_url, me.resume_path];
  const filled = slots.filter((s) => !!s).length;
  return Math.round((filled / slots.length) * 100);
}
