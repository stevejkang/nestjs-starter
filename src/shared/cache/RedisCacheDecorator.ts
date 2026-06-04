import { Logger } from '@nestjs/common';
import { buildCacheKey } from './CacheKeyBuilder';
import { CacheClient, CACHE_CLIENT, MethodCacheOptions } from './interfaces';

const logger = new Logger('MethodCache');

const inflightRequests = new Map<string, Promise<unknown>>();

export function MethodCache(options: MethodCacheOptions) {
  const { prefix, ttlSeconds, keyArgs, deserialize = JSON.parse } = options;

  return <T>(
    _target: object,
    _propertyKey: string | symbol,
    descriptor: TypedPropertyDescriptor<T>,
  ): TypedPropertyDescriptor<T> => {
    const original = descriptor.value as unknown as (...args: unknown[]) => Promise<unknown>;

    (descriptor as TypedPropertyDescriptor<unknown>).value = async function (this: Record<string | symbol, unknown>, ...args: unknown[]): Promise<unknown> {
      const client = this[CACHE_CLIENT] as CacheClient | undefined;
      const cacheKey = buildCacheKey(prefix, args, keyArgs);

      if (client) {
        try {
          const cached = await client.get(cacheKey);
          if (cached !== null) {
            return deserialize(cached);
          }
        } catch {
          logger.warn(`Cache GET failed for key "${cacheKey}", falling back to method execution`);
        }
      }

      const inflight = inflightRequests.get(cacheKey);
      if (inflight) {
        return inflight;
      }

      const promise = original.apply(this, args);
      inflightRequests.set(cacheKey, promise);

      try {
        const result = await promise;

        if (client) {
          try {
            await Promise.all([
              client.set(cacheKey, JSON.stringify(result), ttlSeconds),
              client.sadd(`cache-registry:${prefix}`, cacheKey),
            ]);
          } catch {
            logger.warn(`Cache SET failed for key "${cacheKey}", result returned without caching`);
          }
        }

        return result;
      } finally {
        inflightRequests.delete(cacheKey);
      }
    };

    return descriptor;
  };
}
