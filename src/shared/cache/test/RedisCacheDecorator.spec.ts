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
});
