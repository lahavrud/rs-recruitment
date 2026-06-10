import { renderHook, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { clearResourceCache } from "@/utils/resourceCache";

const { mockGetJobs, mockGetActiveCompanies } = vi.hoisted(() => ({
  mockGetJobs: vi.fn(),
  mockGetActiveCompanies: vi.fn(),
}));

vi.mock("@/services/adminJobs", () => ({ getJobs: mockGetJobs }));
vi.mock("@/services/adminCompanies", () => ({ getActiveCompanies: mockGetActiveCompanies }));

import { useAdminLookups } from "@/hooks/useAdminLookups";

const JOBS_PAGE = {
  items: [{ id: 1, title: "Backend Engineer", company_id: 10 }],
  next_cursor: null,
};
const COMPANIES_PAGE = {
  items: [{ company_profile: { id: 10, name: "Acme" }, user: null }],
  next_cursor: null,
};

beforeEach(() => {
  clearResourceCache();
  mockGetJobs.mockReset().mockResolvedValue(JOBS_PAGE);
  mockGetActiveCompanies.mockReset().mockResolvedValue(COMPANIES_PAGE);
});

describe("useAdminLookups", () => {
  it("does not fetch when disabled", async () => {
    const { result } = renderHook(() => useAdminLookups(false));

    expect(result.current.allJobs).toEqual([]);
    expect(mockGetJobs).not.toHaveBeenCalled();
    expect(mockGetActiveCompanies).not.toHaveBeenCalled();
  });

  it("fetches jobs and active companies when enabled", async () => {
    const { result } = renderHook(() => useAdminLookups(true));

    await waitFor(() => {
      expect(result.current.allJobs).toEqual([
        { id: 1, title: "Backend Engineer", company_id: 10 },
      ]);
    });
    expect(result.current.jobTitleById.get(1)).toBe("Backend Engineer");
    expect(result.current.companyNameById.get(10)).toBe("Acme");
  });

  it("shares the cached result across hook instances", async () => {
    const first = renderHook(() => useAdminLookups(true));
    await waitFor(() => expect(first.result.current.allJobs.length).toBe(1));

    const second = renderHook(() => useAdminLookups(true));
    await waitFor(() => expect(second.result.current.allJobs.length).toBe(1));

    expect(mockGetJobs).toHaveBeenCalledTimes(1);
    expect(mockGetActiveCompanies).toHaveBeenCalledTimes(1);
  });

  it("starts fetching once enabled flips from false to true", async () => {
    const { result, rerender } = renderHook(({ enabled }) => useAdminLookups(enabled), {
      initialProps: { enabled: false },
    });

    expect(mockGetJobs).not.toHaveBeenCalled();

    rerender({ enabled: true });

    await waitFor(() => expect(result.current.allJobs.length).toBe(1));
    expect(mockGetJobs).toHaveBeenCalledTimes(1);
  });

  it("returns the warm cache synchronously on first render, with no empty flash", async () => {
    const first = renderHook(() => useAdminLookups(true));
    await waitFor(() => expect(first.result.current.allJobs.length).toBe(1));

    const second = renderHook(() => useAdminLookups(true));
    expect(second.result.current.allJobs).toEqual([
      { id: 1, title: "Backend Engineer", company_id: 10 },
    ]);
  });
});
