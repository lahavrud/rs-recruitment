/**
 * Mirror of backend `_validate_password_complexity`. Returns an i18n key
 * for the first failing rule, or null when the password satisfies all of:
 *   - at least 8 chars
 *   - at least one uppercase + one lowercase ASCII letter
 *   - at least one digit
 *   - at least one non-alphanumeric character
 */
export function checkPasswordComplexity(val: string): string | null {
  if (val.length < 8) return "publicJobs:application.validation.passwordMin";
  if (!/[A-Z]/.test(val)) return "publicJobs:application.validation.passwordUppercase";
  if (!/[a-z]/.test(val)) return "publicJobs:application.validation.passwordLowercase";
  if (!/\d/.test(val)) return "publicJobs:application.validation.passwordDigit";
  if (/^[A-Za-z0-9]*$/.test(val)) return "publicJobs:application.validation.passwordSpecial";
  return null;
}
