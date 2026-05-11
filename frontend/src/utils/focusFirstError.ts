/**
 * After a submit-time validation has populated an `errors` map, scroll to
 * and focus the first invalid field. Each form input must be wrapped in
 * an element carrying `data-field="<key>"` matching one of the keys in
 * `fieldOrder` — the order list also determines which field is "first"
 * when several are invalid at once.
 *
 * Scheduling on `requestAnimationFrame` lets React commit the new
 * `aria-invalid` / error-text state before we move focus.
 */
export function focusFirstError(
  errors: Record<string, string | undefined>,
  fieldOrder: readonly string[],
): void {
  const firstKey = fieldOrder.find((k) => errors[k]);
  if (!firstKey) return;
  requestAnimationFrame(() => {
    const root = document.querySelector<HTMLElement>(
      `[data-field="${firstKey}"]`,
    );
    if (!root) return;
    const focusable = root.querySelector<HTMLElement>(
      "input, textarea, select, [tabindex]:not([tabindex='-1'])",
    );
    const target = focusable ?? root;
    target.focus({ preventScroll: true });
    target.scrollIntoView({ block: "center", behavior: "smooth" });
  });
}
