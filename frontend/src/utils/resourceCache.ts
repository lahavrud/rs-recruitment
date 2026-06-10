/**
 * Tiny TTL cache for read-mostly admin lookups (jobs, companies, ...).
 *
 * Several admin pages independently fetch the same "limit: 100" lookup
 * lists on every mount, which adds redundant round trips to every page
 * navigation. `getCached` shares a single in-flight request and result
 * across callers for the duration of `ttlMs`.
 */

interface CacheEntry<T> {
  value?: T;
  expiresAt: number;
  pending?: Promise<T>;
}

const cache = new Map<string, CacheEntry<unknown>>();

export function getCached<T>(key: string, fetcher: () => Promise<T>, ttlMs: number): Promise<T> {
  const now = Date.now();
  const entry = cache.get(key) as CacheEntry<T> | undefined;

  if (entry?.value !== undefined && entry.expiresAt > now) {
    return Promise.resolve(entry.value);
  }
  if (entry?.pending) {
    return entry.pending;
  }

  const pending: Promise<T> = fetcher()
    .then((value) => {
      // Only write back if this fetch is still the entry's current one —
      // invalidateCached (or a newer fetch) may have replaced/removed it
      // while this one was in flight, and writing back here would
      // resurrect stale data.
      if (cache.get(key)?.pending === pending) {
        cache.set(key, { value, expiresAt: Date.now() + ttlMs });
      }
      return value;
    })
    .catch((err: unknown) => {
      if (cache.get(key)?.pending === pending) {
        cache.delete(key);
      }
      throw err;
    });

  cache.set(key, { expiresAt: 0, pending });
  return pending;
}

/** Synchronously read a fresh cached value, if any, without triggering a fetch. */
export function peekCached<T>(key: string): T | undefined {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (entry?.value !== undefined && entry.expiresAt > Date.now()) {
    return entry.value;
  }
  return undefined;
}

/** Drop a cached entry so the next `getCached` call refetches. */
export function invalidateCached(key: string): void {
  cache.delete(key);
}

/** Drop all cached entries. Mainly for tests. */
export function clearResourceCache(): void {
  cache.clear();
}
