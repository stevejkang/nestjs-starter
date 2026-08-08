interface LocalCacheEntry {
  value: string;
  freshUntil: number;
  staleUntil: number;
}

export interface LocalCacheHit {
  value: string;
  isStale: boolean;
}

const localCache = new Map<string, LocalCacheEntry>();

export function localCacheGet(key: string): LocalCacheHit | undefined {
  const entry = localCache.get(key);
  if (!entry) {
    return undefined;
  }
  const now = Date.now();
  if (now >= entry.staleUntil) {
    localCache.delete(key);
    return undefined;
  }
  return { value: entry.value, isStale: now >= entry.freshUntil };
}

export function localCacheSet(
  key: string,
  serialized: string,
  ttlSeconds: number,
  maxStaleSeconds: number,
): void {
  if (ttlSeconds <= 0) {
    return;
  }
  const freshUntil = Date.now() + ttlSeconds * 1000;
  localCache.set(key, {
    value: serialized,
    freshUntil,
    staleUntil: freshUntil + Math.max(maxStaleSeconds, 0) * 1000,
  });
}

export function clearLocalCache(prefix?: string): void {
  if (prefix === undefined) {
    localCache.clear();
    return;
  }
  for (const key of localCache.keys()) {
    if (key === prefix || key.startsWith(prefix + ':')) {
      localCache.delete(key);
    }
  }
}
