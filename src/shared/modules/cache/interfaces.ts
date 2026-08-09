/**
 * Abstract Redis client interface.
 * Applications provide their own implementation (ioredis, node-redis, etc.)
 * via the CACHE_CLIENT injection token.
 */
export interface CacheClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds: number): Promise<void>;
  del(keys: string[]): Promise<void>;
  /** Add members to a set (used for cache key registry). */
  sadd(key: string, ...members: string[]): Promise<void>;
  /** Return all members of a set (used for cache key registry). */
  smembers(key: string): Promise<string[]>;
}

export interface MethodCacheOptions {
  /** Cache key prefix. Combined with method arguments to form the full key. */
  prefix: string;
  /** Time-to-live in seconds. */
  ttlSeconds: number;
  /**
   * Indices of method arguments to include in the cache key.
   * When omitted, all arguments are used.
   */
  keyArgs?: number[];
  /**
   * Custom deserializer for cached values.
   * Defaults to `JSON.parse`.
   */
  deserialize?(raw: string): unknown;
  /**
   * Fresh window for the in-process cache in seconds.
   * Defaults to 60 (local caching ON).
   * Pass 0 or a negative value to disable the local layer.
   * The effective fresh window is clamped to `min(localCacheTtlSeconds, ttlSeconds)`
   * so the local cache never outlives the distributed TTL.
   * NOTE: in multi-instance deployments, cache invalidation reaches OTHER instances
   * only after their local fresh window lapses (~this many seconds) —
   * do not enable for read-after-write-critical data.
   */
  localCacheTtlSeconds?: number;
  /**
   * Extra window after freshness in which the stale local value is served
   * immediately while a background refresh runs (stale-while-revalidate).
   * Defaults to `ttlSeconds - effectiveLocalTtl`, clamped to >= 0.
   * 0 disables stale serving.
   */
  localCacheMaxStaleSeconds?: number;
}

export interface InvalidateMethodCacheOptions {
  /** One or more prefixes whose cached entries should be invalidated. */
  prefixes: string | string[];
}

/** Injection token for the CacheClient provider. */
export const CACHE_CLIENT = Symbol('CACHE_CLIENT');
