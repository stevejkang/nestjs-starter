import { InvalidateMethodCache } from '../InvalidateCacheDecorator';
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

    @InvalidateMethodCache({ prefixes: 'user' })
    async updateUser(id: string, name: string): Promise<{ id: string; name: string }> {
      return { id, name };
    }

    @InvalidateMethodCache({ prefixes: ['user', 'profile'] })
    async deleteAccount(id: string): Promise<void> {
      return;
    }
  }

  return new TestService();
}

describe('InvalidateMethodCache', () => {
  describe('single prefix invalidation', () => {
    it('should delete all cached keys for the given prefix', async () => {
      const client = createMockClient({
        smembers: jest.fn().mockResolvedValue(['user:1', 'user:2']),
      });
      const service = createTestService(client);

      await service.updateUser('1', 'Alice');

      expect(client.smembers).toHaveBeenCalledWith('cache-registry:user');
      expect(client.del).toHaveBeenCalledWith(['user:1', 'user:2', 'cache-registry:user']);
    });

    it('should return the method result after invalidation', async () => {
      const client = createMockClient({
        smembers: jest.fn().mockResolvedValue(['user:1']),
      });
      const service = createTestService(client);

      const result = await service.updateUser('1', 'Bob');

      expect(result).toEqual({ id: '1', name: 'Bob' });
    });
  });

  describe('multi-prefix invalidation', () => {
    it('should invalidate keys across all specified prefixes', async () => {
      const client = createMockClient({
        smembers: jest.fn()
          .mockResolvedValueOnce(['user:1'])
          .mockResolvedValueOnce(['profile:1', 'profile:2']),
      });
      const service = createTestService(client);

      await service.deleteAccount('1');

      expect(client.smembers).toHaveBeenCalledWith('cache-registry:user');
      expect(client.smembers).toHaveBeenCalledWith('cache-registry:profile');
      expect(client.del).toHaveBeenCalledWith([
        'user:1',
        'cache-registry:user',
        'profile:1',
        'profile:2',
        'cache-registry:profile',
      ]);
    });
  });

  describe('no keys to invalidate', () => {
    it('should skip deletion when registry is empty', async () => {
      const client = createMockClient({
        smembers: jest.fn().mockResolvedValue([]),
      });
      const service = createTestService(client);

      await service.updateUser('1', 'Alice');

      expect(client.del).not.toHaveBeenCalled();
    });
  });

  describe('graceful degradation on Redis failure', () => {
    it('should return method result when smembers fails', async () => {
      const client = createMockClient({
        smembers: jest.fn().mockRejectedValue(new Error('Redis read error')),
      });
      const service = createTestService(client);

      const result = await service.updateUser('1', 'Charlie');

      expect(result).toEqual({ id: '1', name: 'Charlie' });
    });

    it('should return method result when del fails', async () => {
      const client = createMockClient({
        smembers: jest.fn().mockResolvedValue(['user:1']),
        del: jest.fn().mockRejectedValue(new Error('Redis delete error')),
      });
      const service = createTestService(client);

      const result = await service.updateUser('1', 'Dave');

      expect(result).toEqual({ id: '1', name: 'Dave' });
    });

    it('should return void method result when invalidation fails entirely', async () => {
      const client = createMockClient({
        smembers: jest.fn().mockRejectedValue(new Error('Redis down')),
      });
      const service = createTestService(client);

      await expect(service.deleteAccount('1')).resolves.toBeUndefined();
    });
  });
});
