export type ConsentChoices = { analytics: boolean };

const KEY = "cookie_consent";

export function getConsent(): ConsentChoices | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "analytics" in parsed &&
      typeof (parsed as Record<string, unknown>).analytics === "boolean"
    ) {
      return parsed as ConsentChoices;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveConsent(choices: ConsentChoices): void {
  localStorage.setItem(KEY, JSON.stringify(choices));
}

export function applyGtmConsent(analytics: boolean): void {
  const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
  if (typeof gtag === "function") {
    gtag("consent", "update", {
      analytics_storage: analytics ? "granted" : "denied",
    });
  }
}
