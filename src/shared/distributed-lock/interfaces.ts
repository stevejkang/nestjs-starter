/**
 * Abstract lock client interface.
 * Applications provide their own implementation (ioredis, node-redis, etc.)
 * via the LOCK_CLIENT injection token.
 */
export interface LockClient {
  set(key: string, value: string, px: number, nx: true): Promise<'OK' | null>;
  get(key: string): Promise<string | null>;
  eval(script: string, keys: string[], args: string[]): Promise<unknown>;
}

export interface LockOptions {
  key: string;
  /** Time-to-live in milliseconds. @default 10_000 */
  ttlMs?: number;
  /** Maximum number of acquisition retries. @default 3 */
  retryCount?: number;
  /** Base delay between retries in milliseconds. @default 200 */
  retryDelayMs?: number;
  /** Adds random jitter to retry delay. @default true */
  retryJitter?: boolean;
}

/** Injection token for the LockClient provider. */
export const LOCK_CLIENT = Symbol('LOCK_CLIENT');
