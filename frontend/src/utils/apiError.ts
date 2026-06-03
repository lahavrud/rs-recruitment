import axios from "axios";

/**
 * Maps an axios error to a i18n translation key.
 *
 * `overrides` lets call sites supply context-specific keys for particular
 * status codes (e.g. { 409: "admin:candidates.errors.duplicateEmail" }).
 * Falls through to shared common.errors.* keys for well-known statuses,
 * and to common.genericError for everything else.
 *
 * Returns the key only — pass it to t() at the call site.
 */
export function apiErrorKey(
  error: unknown,
  overrides: Partial<Record<number, string>> = {},
): string {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    if (status !== undefined && status in overrides) return overrides[status]!;
    if (status === 429) return "common:errors.tooManyRequests";
    if (status === 403) return "common:errors.forbidden";
    if (status === 404) return "common:errors.notFound";
    if (status === 409) return "common:errors.conflict";
  }
  return "common:genericError";
}
