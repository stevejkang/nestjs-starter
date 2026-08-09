import { Test } from '@nestjs/testing';

import { DistributedLockService } from '../DistributedLockService';
import { LockClient, LOCK_CLIENT } from '../interfaces';

function createMockClient(overrides: Partial<LockClient> = {}): LockClient {
  return {
    set: jest.fn().mockResolvedValue(null),
    get: jest.fn().mockResolvedValue(null),
    eval: jest.fn().mockResolvedValue(0),
    ...overrides,
  };
}

async function buildService(client: LockClient): Promise<DistributedLockService> {
  const module = await Test.createTestingModule({
    providers: [
      DistributedLockService,
      { provide: LOCK_CLIENT, useValue: client },
    ],
  }).compile();

  return module.get(DistributedLockService);
}

describe('DistributedLockService', () => {
  describe('acquireLock', () => {
    it('returns a lock value on successful acquisition', async () => {
      const client = createMockClient({
        set: jest.fn().mockResolvedValue('OK'),
      });
      const service = await buildService(client);

      const value = await service.acquireLock({ key: 'test-lock', retryCount: 0 });

      expect(value).not.toBeNull();
      expect(typeof value).toBe('string');
      expect(client.set).toHaveBeenCalledWith(
        'test-lock',
        expect.any(String),
        10_000,
        true,
      );
    });

    it('returns null when lock is already held and retries exhausted', async () => {
      const client = createMockClient({
        set: jest.fn().mockResolvedValue(null),
      });
      const service = await buildService(client);

      const value = await service.acquireLock({
        key: 'test-lock',
        retryCount: 0,
      });

      expect(value).toBeNull();
    });

    it('retries on failure and succeeds on later attempt', async () => {
      const setMock = jest.fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce('OK');
      const client = createMockClient({ set: setMock });
      const service = await buildService(client);

      const value = await service.acquireLock({
        key: 'test-lock',
        retryCount: 3,
        retryDelayMs: 10,
        retryJitter: false,
      });

      expect(value).not.toBeNull();
      expect(setMock).toHaveBeenCalledTimes(3);
    });

    it('respects retryCount limit', async () => {
      const setMock = jest.fn().mockResolvedValue(null);
      const client = createMockClient({ set: setMock });
      const service = await buildService(client);

      const value = await service.acquireLock({
        key: 'test-lock',
        retryCount: 2,
        retryDelayMs: 10,
        retryJitter: false,
      });

      expect(value).toBeNull();
      // 1 initial + 2 retries = 3 total
      expect(setMock).toHaveBeenCalledTimes(3);
    });

    it('uses custom ttlMs', async () => {
      const setMock = jest.fn().mockResolvedValue('OK');
      const client = createMockClient({ set: setMock });
      const service = await buildService(client);

      await service.acquireLock({ key: 'test-lock', ttlMs: 5000, retryCount: 0 });

      expect(setMock).toHaveBeenCalledWith('test-lock', expect.any(String), 5000, true);
    });
  });

  describe('releaseLock', () => {
    it('releases lock when value matches', async () => {
      const client = createMockClient({
        eval: jest.fn().mockResolvedValue(1),
      });
      const service = await buildService(client);

      const released = await service.releaseLock('test-lock', 'lock-value-123');

      expect(released).toBe(true);
      expect(client.eval).toHaveBeenCalledWith(
        expect.stringContaining('redis.call("get"'),
        ['test-lock'],
        ['lock-value-123'],
      );
    });

    it('does not release lock when value does not match', async () => {
      const client = createMockClient({
        eval: jest.fn().mockResolvedValue(0),
      });
      const service = await buildService(client);

      const released = await service.releaseLock('test-lock', 'wrong-value');

      expect(released).toBe(false);
    });
  });

  describe('executeWithLock', () => {
    it('acquires lock, executes function, and releases', async () => {
      const client = createMockClient({
        set: jest.fn().mockResolvedValue('OK'),
        eval: jest.fn().mockResolvedValue(1),
      });
      const service = await buildService(client);
      const fn = jest.fn().mockResolvedValue('result');

      const result = await service.executeWithLock(
        { key: 'test-lock', retryCount: 0 },
        fn,
      );

      expect(result).toBe('result');
      expect(fn).toHaveBeenCalledTimes(1);
      expect(client.eval).toHaveBeenCalledTimes(1);
    });

    it('releases lock even when function throws', async () => {
      const client = createMockClient({
        set: jest.fn().mockResolvedValue('OK'),
        eval: jest.fn().mockResolvedValue(1),
      });
      const service = await buildService(client);
      const error = new Error('fn-error');

      await expect(
        service.executeWithLock({ key: 'test-lock', retryCount: 0 }, () =>
          Promise.reject(error),
        ),
      ).rejects.toThrow('fn-error');

      expect(client.eval).toHaveBeenCalledTimes(1);
    });

    it('throws when lock acquisition fails', async () => {
      const client = createMockClient({
        set: jest.fn().mockResolvedValue(null),
      });
      const service = await buildService(client);
      const fn = jest.fn();

      await expect(
        service.executeWithLock(
          { key: 'test-lock', retryCount: 0 },
          fn,
        ),
      ).rejects.toThrow();

      expect(fn).not.toHaveBeenCalled();
      expect(client.eval).not.toHaveBeenCalled();
    });
  });
});
