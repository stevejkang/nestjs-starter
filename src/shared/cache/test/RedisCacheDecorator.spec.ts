import { MethodCache } from '../RedisCacheDecorator';
import { CacheClient, CACHE_CLIENT } from '../interfaces';

function createMockClient(overrides: Partial<CacheClient> = {}): CacheClient {
  return {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
    sadd: jest.fn().mockResolvedValue(undefined),
    smembers: jest.fn().mockResolvedValue([]),
    ...overrides,
  };
}

function createTestService(client: CacheClient) {
  class TestService {
    [CACHE_CLIENT] = client;

    @MethodCache({ prefix: 'user', ttlSeconds: 60 })
    async getUser(id: string): Promise<{ id: string; name: string }> {
      return { id, name: `User ${id}` };
    }

    @MethodCache({ prefix: 'item', ttlSeconds: 30, keyArgs: [0] })
    async getItem(id: number, _locale: string): Promise<{ id: number }> {
      return { id };
    }

    @MethodCache({
      prefix: 'custom',
      ttlSeconds: 10,
      deserialize: (raw: string) => {
        const parsed = JSON.parse(raw);
        parsed.deserialized = true;
        return parsed;
      },
    })
    async getCustom(key: string): Promise<{ key: string }> {
      return { key };
    }
  }

  return new TestService();
}

/** Each caller must pass a unique `prefix`: the inflight registry is shared process-wide. */
function createSpyService(
  client: CacheClient,
  spy: jest.Mock,
  prefix: string,
): { getData(key: string): Promise<unknown> } {
  class TestService {
    [CACHE_CLIENT] = client;

    @MethodCache({ prefix, ttlSeconds: 60 })
    async getData(key: string): Promise<unknown> {
      return spy(key);
    }
  }

  return new TestService();
}

describe('MethodCache', () => {
  describe('cache hit', () => {
    it('should return cached value without calling the original method', async () => {
      const cachedValue = JSON.stringify({ id: '1', name: 'Cached User' });
      const client = createMockClient({ get: jest.fn().mockResolvedValue(cachedValue) });
      const service = createTestService(client);

      const spy = jest.spyOn(service, 'getUser');
      const result = await service.getUser('1');

      expect(result).toEqual({ id: '1', name: 'Cached User' });
      expect(client.get).toHaveBeenCalledWith('user:1');
      expect(spy).toHaveReturnedWith(expect.any(Promise));
    });
  });

  describe('cache miss', () => {
    it('should call original method and cache the result', async () => {
      const client = createMockClient();
      const service = createTestService(client);

      const result = await service.getUser('42');

      expect(result).toEqual({ id: '42', name: 'User 42' });
      expect(client.get).toHaveBeenCalledWith('user:42');
      expect(client.set).toHaveBeenCalledWith(
        'user:42',
        JSON.stringify({ id: '42', name: 'User 42' }),
        60,
      );
    });

    it('should register the cache key in a registry set', async () => {
      const client = createMockClient();
      const service = createTestService(client);

      await service.getUser('1');

      expect(client.sadd).toHaveBeenCalledWith('cache-registry:user', 'user:1');
    });
  });

  describe('selective key arguments', () => {
    it('should build cache key from selected argument indices only', async () => {
      const client = createMockClient();
      const service = createTestService(client);

      await service.getItem(99, 'ko');

      expect(client.get).toHaveBeenCalledWith('item:99');
    });
  });

  describe('custom deserializer', () => {
    it('should use custom deserialize function on cache hit', async () => {
      const cached = JSON.stringify({ key: 'val' });
      const client = createMockClient({ get: jest.fn().mockResolvedValue(cached) });
      const service = createTestService(client);

      const result = await service.getCustom('val');

      expect(result).toEqual({ key: 'val', deserialized: true });
    });
  });

  describe('request coalescing', () => {
    it('should execute method only once for concurrent identical calls', async () => {
      const client = createMockClient();
      const service = createTestService(client);

      const [r1, r2, r3] = await Promise.all([
        service.getUser('1'),
        service.getUser('1'),
        service.getUser('1'),
      ]);

      expect(r1).toEqual(r2);
      expect(r2).toEqual(r3);
      expect(client.set).toHaveBeenCalledTimes(1);
    });
  });

  describe('without cache client', () => {
    it('should execute method and return result without caching', async () => {
      class NoCacheService {
        @MethodCache({ prefix: 'user', ttlSeconds: 60 })
        async getUser(id: string): Promise<{ id: string; name: string }> {
          return { id, name: `User ${id}` };
        }
      }

      const service = new NoCacheService();
      const result = await service.getUser('1');

      expect(result).toEqual({ id: '1', name: 'User 1' });
    });

    it('should handle concurrent calls without cache client', async () => {
      class NoCacheService {
        @MethodCache({ prefix: 'user', ttlSeconds: 60 })
        async getUser(id: string): Promise<{ id: string; name: string }> {
          return { id, name: `User ${id}` };
        }
      }

      const service = new NoCacheService();
      const [r1, r2] = await Promise.all([
        service.getUser('1'),
        service.getUser('1'),
      ]);

      expect(r1).toEqual({ id: '1', name: 'User 1' });
      expect(r2).toEqual({ id: '1', name: 'User 1' });
    });
  });

  describe('graceful degradation on Redis failure', () => {
    it('should fall back to original method when Redis get fails', async () => {
      const client = createMockClient({
        get: jest.fn().mockRejectedValue(new Error('Redis connection lost')),
      });
      const service = createTestService(client);

      const result = await service.getUser('1');

      expect(result).toEqual({ id: '1', name: 'User 1' });
    });

    it('should return result even when Redis set fails', async () => {
      const client = createMockClient({
        set: jest.fn().mockRejectedValue(new Error('Redis write failed')),
        sadd: jest.fn().mockRejectedValue(new Error('Redis write failed')),
      });
      const service = createTestService(client);

      const result = await service.getUser('1');

      expect(result).toEqual({ id: '1', name: 'User 1' });
    });

    it('should not throw when Redis sadd (registry) fails', async () => {
      const client = createMockClient({
        sadd: jest.fn().mockRejectedValue(new Error('Redis SADD failed')),
      });
      const service = createTestService(client);

      await expect(service.getUser('1')).resolves.toEqual({
        id: '1',
        name: 'User 1',
      });
    });
  });

  describe('coalescing failure paths', () => {
    it('should propagate the same error to every concurrent waiter', async () => {
      const client = createMockClient();
      const spy = jest.fn().mockRejectedValue(new Error('DB_FAIL'));
      const service = createSpyService(client, spy, 'coalesce-error');

      const results = await Promise.allSettled([
        service.getData('k'),
        service.getData('k'),
        service.getData('k'),
      ]);

      for (const result of results) {
        expect(result.status).toBe('rejected');
        if (result.status === 'rejected') {
          expect((result.reason as Error).message).toBe('DB_FAIL');
        }
      }
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should not cache the result when the method rejects', async () => {
      const client = createMockClient();
      const spy = jest.fn().mockRejectedValue(new Error('DB_FAIL'));
      const service = createSpyService(client, spy, 'coalesce-no-cache');

      await expect(service.getData('k')).rejects.toThrow('DB_FAIL');

      expect(client.set).not.toHaveBeenCalled();
      expect(client.sadd).not.toHaveBeenCalled();
    });

    it('should clean up inflight after a rejection so the next call retries', async () => {
      const client = createMockClient();
      const spy = jest
        .fn()
        .mockRejectedValueOnce(new Error('DB_FAIL'))
        .mockResolvedValueOnce({ ok: true });
      const service = createSpyService(client, spy, 'retry-after-failure');

      await expect(service.getData('k')).rejects.toThrow('DB_FAIL');
      await expect(service.getData('k')).resolves.toEqual({ ok: true });

      expect(spy).toHaveBeenCalledTimes(2);
    });

    it('should clean up inflight after success so a later cache miss re-executes', async () => {
      const client = createMockClient();
      const spy = jest.fn().mockResolvedValue({ ok: true });
      const service = createSpyService(client, spy, 'retry-after-success');

      await service.getData('k');
      await service.getData('k');

      expect(spy).toHaveBeenCalledTimes(2);
    });

    it('should clean up inflight when the cache write fails', async () => {
      const client = createMockClient({
        set: jest.fn().mockRejectedValue(new Error('Redis write failed')),
      });
      const spy = jest.fn().mockResolvedValue({ ok: true });
      const service = createSpyService(client, spy, 'retry-after-set-failure');

      await expect(service.getData('k')).resolves.toEqual({ ok: true });
      await expect(service.getData('k')).resolves.toEqual({ ok: true });

      expect(spy).toHaveBeenCalledTimes(2);
    });
  });

  describe('independent cache keys', () => {
    it('should execute concurrent calls with different keys independently', async () => {
      const client = createMockClient();
      const spy = jest.fn().mockImplementation((key: string) => Promise.resolve({ key }));
      const service = createSpyService(client, spy, 'independent');

      const [first, second] = await Promise.all([
        service.getData('a'),
        service.getData('b'),
      ]);

      expect(first).toEqual({ key: 'a' });
      expect(second).toEqual({ key: 'b' });
      expect(spy).toHaveBeenCalledTimes(2);
    });

    it('should write a separate cache entry per key', async () => {
      const client = createMockClient();
      const spy = jest.fn().mockImplementation((key: string) => Promise.resolve({ key }));
      const service = createSpyService(client, spy, 'independent-keys');

      await Promise.all([service.getData('a'), service.getData('b')]);

      expect(client.set).toHaveBeenCalledWith(
        'independent-keys:a',
        JSON.stringify({ key: 'a' }),
        60,
      );
      expect(client.set).toHaveBeenCalledWith(
        'independent-keys:b',
        JSON.stringify({ key: 'b' }),
        60,
      );
    });
  });

  describe('corrupt cached value', () => {
    it('should fall back to the original method when cached JSON is malformed', async () => {
      const client = createMockClient({
        get: jest.fn().mockResolvedValue('not-valid-json{{{'),
      });
      const spy = jest.fn().mockResolvedValue({ ok: true });
      const service = createSpyService(client, spy, 'corrupt');

      const result = await service.getData('k');

      expect(result).toEqual({ ok: true });
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should overwrite the corrupt entry with the fresh result', async () => {
      const client = createMockClient({
        get: jest.fn().mockResolvedValue('not-valid-json{{{'),
      });
      const spy = jest.fn().mockResolvedValue({ ok: true });
      const service = createSpyService(client, spy, 'corrupt-overwrite');

      await service.getData('k');

      expect(client.set).toHaveBeenCalledWith(
        'corrupt-overwrite:k',
        JSON.stringify({ ok: true }),
        60,
      );
    });

    it('should fall back to the original method when a custom deserializer throws', async () => {
      const client = createMockClient({
        get: jest.fn().mockResolvedValue(JSON.stringify({ ok: true })),
      });
      const spy = jest.fn().mockResolvedValue({ ok: 'from-origin' });

      class TestService {
        [CACHE_CLIENT] = client;

        @MethodCache({
          prefix: 'bad-deserializer',
          ttlSeconds: 60,
          deserialize: () => {
            throw new Error('deserialize blew up');
          },
        })
        async getData(key: string): Promise<unknown> {
          return spy(key);
        }
      }

      const result = await new TestService().getData('k');

      expect(result).toEqual({ ok: 'from-origin' });
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe('null return values', () => {
    it('should cache a null result and serve it from cache without re-executing', async () => {
      const client = createMockClient();
      const spy = jest.fn().mockResolvedValue(null);
      const service = createSpyService(client, spy, 'nullable');

      const firstResult = await service.getData('k');
      expect(firstResult).toBeNull();
      expect(client.set).toHaveBeenCalledWith('nullable:k', 'null', 60);

      (client.get as jest.Mock).mockResolvedValue('null');
      const secondResult = await service.getData('k');

      expect(secondResult).toBeNull();
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });
});
