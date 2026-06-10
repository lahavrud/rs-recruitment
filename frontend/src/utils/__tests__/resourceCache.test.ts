import { clearResourceCache, getCached, invalidateCached } from "@/utils/resourceCache";

beforeEach(() => {
  clearResourceCache();
});

describe("getCached", () => {
  it("calls the fetcher once and reuses the result within the TTL", async () => {
    const fetcher = vi.fn().mockResolvedValue("value");

    expect(await getCached("key", fetcher, 1000)).toBe("value");
    expect(await getCached("key", fetcher, 1000)).toBe("value");

    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("dedupes concurrent in-flight calls for the same key", async () => {
    let resolve!: (value: string) => void;
    const fetcher = vi.fn().mockReturnValue(
      new Promise<string>((res) => {
        resolve = res;
      }),
    );

    const first = getCached("key", fetcher, 1000);
    const second = getCached("key", fetcher, 1000);
    resolve("value");

    expect(await first).toBe("value");
    expect(await second).toBe("value");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("refetches after the TTL expires", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce("first").mockResolvedValueOnce("second");

    expect(await getCached("key", fetcher, -1)).toBe("first");
    expect(await getCached("key", fetcher, -1)).toBe("second");

    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("does not cache a rejected fetch", async () => {
    const fetcher = vi.fn().mockRejectedValueOnce(new Error("boom")).mockResolvedValueOnce("value");

    await expect(getCached("key", fetcher, 1000)).rejects.toThrow("boom");
    expect(await getCached("key", fetcher, 1000)).toBe("value");
  });

  it("invalidateCached forces a refetch", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce("first").mockResolvedValueOnce("second");

    expect(await getCached("key", fetcher, 1000)).toBe("first");
    invalidateCached("key");
    expect(await getCached("key", fetcher, 1000)).toBe("second");
  });
});
