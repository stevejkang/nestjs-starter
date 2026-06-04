import { Logger } from '@nestjs/common';
import { CacheClient, CACHE_CLIENT, InvalidateMethodCacheOptions } from './interfaces';

const logger = new Logger('InvalidateMethodCache');

export function InvalidateMethodCache(options: InvalidateMethodCacheOptions) {
  const prefixes = Array.isArray(options.prefixes) ? options.prefixes : [options.prefixes];

  return <T>(
    _target: object,
    _propertyKey: string | symbol,
    descriptor: TypedPropertyDescriptor<T>,
  ): TypedPropertyDescriptor<T> => {
    const original = descriptor.value as unknown as (...args: unknown[]) => Promise<unknown>;

    (descriptor as TypedPropertyDescriptor<unknown>).value = async function (this: Record<string | symbol, unknown>, ...args: unknown[]): Promise<unknown> {
      const result = await original.apply(this, args);

      const client = this[CACHE_CLIENT] as CacheClient | undefined;
      if (!client) return result;

      try {
        const keysToDelete: string[] = [];

        for (const prefix of prefixes) {
          const registryKey = `cache-registry:${prefix}`;
          const members = await client.smembers(registryKey);
          if (members.length > 0) {
            keysToDelete.push(...members, registryKey);
          }
        }

        if (keysToDelete.length > 0) {
          await client.del(keysToDelete);
        }
      } catch {
        logger.warn(`Cache invalidation failed for prefixes [${prefixes.join(', ')}]`);
      }

      return result;
    };

    return descriptor;
  };
}
