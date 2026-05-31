/**
 * Shallow "form vs initial-form" dirty check via JSON serialization.
 * Used by edit-dialogs to drive the discard-changes confirm. Note:
 * JSON.stringify is key-order sensitive — fine when both sides are
 * seeded from the same template (the standard pattern in this repo).
 */
export function isDirtyByJSON<T>(form: T, initial: T): boolean {
  return JSON.stringify(form) !== JSON.stringify(initial);
}
