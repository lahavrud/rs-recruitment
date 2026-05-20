function getClientId(): string {
  // Prefer the _ga cookie set by gtag.js — keeps server-side events in the
  // same GA4 session as client-side page_view events for non-blocked users.
  const ga = document.cookie.split("; ").find((c) => c.startsWith("_ga="));
  if (ga) {
    const parts = ga.split("=")[1]?.split(".");
    if (parts && parts.length >= 4) return parts.slice(2).join(".");
  }
  // Fallback: our own first-party ID for users whose ad blocker also blocks
  // gtag.js (so _ga is never set). Persisted in localStorage across sessions.
  const stored = localStorage.getItem("rs_cid");
  if (stored) return stored;
  const id = crypto.randomUUID();
  localStorage.setItem("rs_cid", id);
  return id;
}

export function trackEvent(
  name: string,
  params: Record<string, string | number | boolean>,
): void {
  const client_id = getClientId();
  fetch("/api/analytics/collect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, params, client_id }),
    keepalive: true,
  }).catch(() => {});
}
