export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface CacheEntry<T> {
  savedAt: number;
  data: T;
}

export function readEntry<T>(store: KeyValueStore, key: string): CacheEntry<T> | null {
  try {
    const raw = store.getItem(key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !("savedAt" in parsed) || !("data" in parsed)) {
      return null;
    }
    const entry = parsed as { savedAt: unknown; data: T };
    if (typeof entry.savedAt !== "number" || !Number.isFinite(entry.savedAt)) return null;
    return { savedAt: entry.savedAt, data: entry.data };
  } catch {
    return null;
  }
}

export function writeEntry<T>(store: KeyValueStore, key: string, data: T, now: number): void {
  try {
    store.setItem(key, JSON.stringify({ savedAt: now, data }));
  } catch {
    // Privat tilstand eller fyldt lager. Siden virker videre uden cache.
  }
}

export function cacheState(savedAt: number, now: number, ttlMs: number): "fresh" | "stale" {
  return now - savedAt < ttlMs ? "fresh" : "stale";
}

/**
 * Frisk cache bruges med det samme.
 * Er den for gammel, hentes der nyt. Fejler nettet, bruges den gamle kopi.
 */
export async function loadCachedEntry<T>(options: {
  store: KeyValueStore | null;
  key: string;
  ttlMs: number;
  now?: number;
  load: () => Promise<T>;
}): Promise<{ data: T; savedAt: number }> {
  const now = options.now ?? Date.now();
  const entry = options.store ? readEntry<T>(options.store, options.key) : null;
  if (entry && cacheState(entry.savedAt, now, options.ttlMs) === "fresh") {
    return { data: entry.data, savedAt: entry.savedAt };
  }
  try {
    const data = await options.load();
    if (options.store) writeEntry(options.store, options.key, data, now);
    return { data, savedAt: now };
  } catch (error) {
    if (entry) return { data: entry.data, savedAt: entry.savedAt };
    throw error;
  }
}

export async function loadCached<T>(options: {
  store: KeyValueStore | null;
  key: string;
  ttlMs: number;
  now?: number;
  load: () => Promise<T>;
}): Promise<T> {
  const result = await loadCachedEntry(options);
  return result.data;
}
