export const SALARY_STEP = 500;

export function formatSalaryShort(n: number): string {
  return `${n.toLocaleString("he-IL")} ₪`;
}
