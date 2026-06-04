import { DynamicModule, Logger, Module } from '@nestjs/common';
import { DistributedLockService } from './DistributedLockService';
import { LOCK_CLIENT, LockClient } from './interfaces';

export interface DistributedLockModuleOptions {
  client?: LockClient;
}

const noopClient: LockClient = {
  set: async (): Promise<null> => null,
  get: async (): Promise<null> => null,
  eval: async (): Promise<unknown> => 0,
};

@Module({})
export class DistributedLockModule {
  private static readonly logger = new Logger(DistributedLockModule.name);

  static forRoot(options: DistributedLockModuleOptions = {}): DynamicModule {
    const client = options.client ?? noopClient;

    if (!options.client) {
      this.logger.warn(
        'No LockClient provided to DistributedLockModule.forRoot(). Using no-op fallback — locking is disabled.',
      );
    }

    return {
      module: DistributedLockModule,
      global: true,
      providers: [
        {
          provide: LOCK_CLIENT,
          useValue: client,
        },
        DistributedLockService,
      ],
      exports: [LOCK_CLIENT, DistributedLockService],
    };
  }
}
