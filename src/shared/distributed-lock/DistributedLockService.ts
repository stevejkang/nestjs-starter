import { randomUUID } from 'node:crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { LOCK_CLIENT, LockClient, LockOptions } from './interfaces';

const RELEASE_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
else
  return 0
end
`;

const DEFAULT_TTL_MS = 10_000;
const DEFAULT_RETRY_COUNT = 3;
const DEFAULT_RETRY_DELAY_MS = 200;

@Injectable()
export class DistributedLockService {
  private readonly logger = new Logger(DistributedLockService.name);

  constructor(
    @Inject(LOCK_CLIENT) private readonly client: LockClient,
  ) {}

  async acquireLock(options: LockOptions): Promise<string | null> {
    const {
      key,
      ttlMs = DEFAULT_TTL_MS,
      retryCount = DEFAULT_RETRY_COUNT,
      retryDelayMs = DEFAULT_RETRY_DELAY_MS,
      retryJitter = true,
    } = options;

    const value = `${Date.now()}:${process.pid}:${randomUUID()}`;
    const maxAttempts = 1 + retryCount;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const result = await this.client.set(key, value, ttlMs, true);

      if (result === 'OK') {
        this.logger.debug(`Lock acquired: ${key} (attempt ${attempt + 1})`);
        return value;
      }

      if (attempt < maxAttempts - 1) {
        const delay = retryJitter
          ? retryDelayMs + Math.floor(Math.random() * retryDelayMs)
          : retryDelayMs;
        await this.sleep(delay);
      }
    }

    this.logger.warn(`Lock acquisition failed after ${maxAttempts} attempts: ${key}`);
    return null;
  }

  async releaseLock(key: string, value: string): Promise<boolean> {
    const result = await this.client.eval(RELEASE_SCRIPT, [key], [value]);
    const released = result === 1;

    if (released) {
      this.logger.debug(`Lock released: ${key}`);
    } else {
      this.logger.warn(`Lock release failed (value mismatch or expired): ${key}`);
    }

    return released;
  }

  async executeWithLock<T>(options: LockOptions, fn: () => Promise<T>): Promise<T> {
    const lockValue = await this.acquireLock(options);

    if (lockValue === null) {
      throw new Error(`Failed to acquire lock: ${options.key}`);
    }

    try {
      return await fn();
    } finally {
      await this.releaseLock(options.key, lockValue);
    }
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }
}
