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
}

export interface InvalidateMethodCacheOptions {
  /** One or more prefixes whose cached entries should be invalidated. */
  prefixes: string | string[];
}

/** Injection token for the CacheClient provider. */
export const CACHE_CLIENT = Symbol('CACHE_CLIENT');
