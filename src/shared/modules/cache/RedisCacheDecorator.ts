import { Logger } from '@nestjs/common';
import { buildCacheKey } from './CacheKeyBuilder';
import { localCacheGet, localCacheSet } from './LocalCache';
import { CacheClient, CACHE_CLIENT, MethodCacheOptions } from './interfaces';

const logger = new Logger('MethodCache');

const DEFAULT_LOCAL_CACHE_TTL_SECONDS = 60;

const inflightRequests = new Map<string, Promise<unknown>>();

export function MethodCache(options: MethodCacheOptions) {
  const { prefix, ttlSeconds, keyArgs, deserialize = JSON.parse } = options;
  const localCacheTtl = Math.min(options.localCacheTtlSeconds ?? DEFAULT_LOCAL_CACHE_TTL_SECONDS, ttlSeconds);
  const localCacheMaxStale = options.localCacheMaxStaleSeconds ?? (ttlSeconds - localCacheTtl);

  return <T>(
    _target: object,
    _propertyKey: string | symbol,
    descriptor: TypedPropertyDescriptor<T>,
  ): TypedPropertyDescriptor<T> => {
    const original = descriptor.value as unknown as (...args: unknown[]) => Promise<unknown>;

    (descriptor as TypedPropertyDescriptor<unknown>).value = async function (this: Record<string | symbol, unknown>, ...args: unknown[]): Promise<unknown> {
      const client = this[CACHE_CLIENT] as CacheClient | undefined;
      const cacheKey = buildCacheKey(prefix, args, keyArgs);

      const fetchThroughCache = async (redisClient: CacheClient): Promise<unknown> => {
        let cached: string | null = null;
        try {
          cached = await redisClient.get(cacheKey);
        } catch {
          logger.warn(`Cache GET failed for key "${cacheKey}", falling back to method execution`);
        }

        if (cached !== null) {
          try {
            const value = deserialize(cached);
            localCacheSet(cacheKey, cached, localCacheTtl, localCacheMaxStale);
            return value;
          } catch {
            logger.warn(`Cache parse failed for key "${cacheKey}", falling back to method execution`);
          }
        }

        const result = await original.apply(this, args);
        try {
          const serialized = JSON.stringify(result);
          localCacheSet(cacheKey, serialized, localCacheTtl, localCacheMaxStale);
          await Promise.all([
            redisClient.set(cacheKey, serialized, ttlSeconds),
            redisClient.sadd(`cache-registry:${prefix}`, cacheKey),
          ]);
        } catch {
          logger.warn(`Cache SET failed for key "${cacheKey}", result returned without caching`);
        }
        return result;
      };

      // [i] Local cache lookup
      const localHit = localCacheGet(cacheKey);
      if (localHit) {
        try {
          const value = deserialize(localHit.value);
          if (localHit.isStale && client && !inflightRequests.has(cacheKey)) {
            const refresh = fetchThroughCache(client);
            inflightRequests.set(cacheKey, refresh);
            refresh
              .catch(() => { logger.warn(`Background refresh failed for key "${cacheKey}"`); })
              .finally(() => { inflightRequests.delete(cacheKey); });
          }
          return value;
        } catch {
          logger.warn(`Local cache deserialize failed for key "${cacheKey}", falling back`);
        }
      }

      // [ii] No client — origin-only coalescing path (no local writes)
      if (!client) {
        const inflight = inflightRequests.get(cacheKey);
        if (inflight) {
          return inflight;
        }

        const promise = original.apply(this, args);
        inflightRequests.set(cacheKey, promise);
        try {
          return await promise;
        } finally {
          inflightRequests.delete(cacheKey);
        }
      }

      // [iii] Inflight check
      if (inflightRequests.has(cacheKey)) {
        return inflightRequests.get(cacheKey);
      }

      // [iv] Fetch through cache with inflight registration
      const promise = fetchThroughCache(client);
      inflightRequests.set(cacheKey, promise);
      try {
        return await promise;
      } finally {
        inflightRequests.delete(cacheKey);
      }
    };

    return descriptor;
  };
}
