import { describe, expect, it } from "vitest";
import { formatSalary } from "@/utils/salary";

describe("formatSalary", () => {
  it("formats a full range with thousands separators", () => {
    expect(formatSalary(12000, 15000)).toBe("12,000–15,000 ₪/חודש");
  });

  it("formats a minimum-only salary", () => {
    expect(formatSalary(12000, null)).toBe("מ-12,000 ₪/חודש");
  });

  it("formats a maximum-only salary", () => {
    expect(formatSalary(null, 15000)).toBe("עד 15,000 ₪/חודש");
  });

  it("returns null when no bounds are set", () => {
    expect(formatSalary(null, null)).toBeNull();
  });
});
