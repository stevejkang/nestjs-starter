import { DynamicModule, Logger, Module } from '@nestjs/common';
import { CacheClient, CACHE_CLIENT } from './interfaces';

export interface RedisCacheModuleOptions {
  client?: CacheClient;
}

const noopClient: CacheClient = {
  get: async () => null,
  set: async () => {},
  del: async () => {},
  sadd: async () => {},
  smembers: async () => [],
};

@Module({})
export class RedisCacheModule {
  private static readonly logger = new Logger(RedisCacheModule.name);

  static forRoot(options: RedisCacheModuleOptions = {}): DynamicModule {
    const client = options.client ?? noopClient;

    if (!options.client) {
      this.logger.warn(
        'No CacheClient provided to RedisCacheModule.forRoot(). Using no-op fallback — caching is disabled.',
      );
    }

    return {
      module: RedisCacheModule,
      global: true,
      providers: [
        {
          provide: CACHE_CLIENT,
          useValue: client,
        },
      ],
      exports: [CACHE_CLIENT],
    };
  }
}
