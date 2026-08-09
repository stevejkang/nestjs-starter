import { clearLocalCache } from '../LocalCache';
import { MethodCache } from '../RedisCacheDecorator';
import { InvalidateMethodCache } from '../InvalidateCacheDecorator';
import { CacheClient, CACHE_CLIENT, MethodCacheOptions } from '../interfaces';

const mockData = { id: 1, title: 'test-data' };
const freshData = { id: 1, title: 'fresh-data' };

const flushAsync = () => new Promise((resolve) => setImmediate(resolve));

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

function createSpyService(
  client: CacheClient,
  spy: jest.Mock,
  prefix: string,
  extraOptions: Partial<Omit<MethodCacheOptions, 'prefix'>> = {},
): { getData(key: string): Promise<unknown> } {
  const opts: MethodCacheOptions = { prefix, ttlSeconds: 600, ...extraOptions };

  class TestService {
    [CACHE_CLIENT] = client;

    @MethodCache(opts)
    async getData(key: string): Promise<unknown> {
      return spy(key);
    }
  }

  return new TestService();
}

describe('MethodCache — local cache + stale-while-revalidate', () => {
  let now: number;

  beforeEach(() => {
    clearLocalCache();
    now = 1_700_000_000_000;
    jest.spyOn(Date, 'now').mockImplementation(() => now);
  });

  afterEach(async () => {
    await flushAsync();
    jest.restoreAllMocks();
  });

  describe('local cache', () => {
    it('Redis hit then re-call → local hit, client.get called once, spy 0', async () => {
      const spy = jest.fn().mockResolvedValue(mockData);
      const mockGet = jest.fn().mockResolvedValue(JSON.stringify(mockData));
      const client = createMockClient({ get: mockGet });
      const service = createSpyService(client, spy, 'l1');

      const first = await service.getData('x');
      const second = await service.getData('x');

      expect(first).toEqual(mockData);
      expect(second).toEqual(mockData);
      expect(mockGet).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledTimes(0);
    });

    it('origin fetch then re-call → local hit, spy 1, get 1', async () => {
      const spy = jest.fn().mockResolvedValue(mockData);
      const client = createMockClient();
      const service = createSpyService(client, spy, 'l2');

      await service.getData('x');
      const second = await service.getData('x');

      expect(second).toEqual(mockData);
      expect(spy).toHaveBeenCalledTimes(1);
      expect((client.get as jest.Mock)).toHaveBeenCalledTimes(1);
    });

    it('client.set rejects → local still populated, re-call serves local without origin', async () => {
      const spy = jest.fn().mockResolvedValue(mockData);
      const client = createMockClient({ set: jest.fn().mockRejectedValue(new Error('Redis connection refused')) });
      const service = createSpyService(client, spy, 'l3');

      await service.getData('x');
      const second = await service.getData('x');

      expect(second).toEqual(mockData);
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('localCacheTtlSeconds=0 → every call hits Redis', async () => {
      const spy = jest.fn().mockResolvedValue(mockData);
      const mockGet = jest.fn().mockResolvedValue(JSON.stringify(mockData));
      const client = createMockClient({ get: mockGet });
      const service = createSpyService(client, spy, 'l4', { localCacheTtlSeconds: 0 });

      await service.getData('x');
      await service.getData('x');

      expect(mockGet).toHaveBeenCalledTimes(2);
    });

    it('negative localCacheTtlSeconds → every call hits Redis', async () => {
      const spy = jest.fn().mockResolvedValue(mockData);
      const mockGet = jest.fn().mockResolvedValue(JSON.stringify(mockData));
      const client = createMockClient({ get: mockGet });
      const service = createSpyService(client, spy, 'l5', { localCacheTtlSeconds: -1 });

      await service.getData('x');
      await service.getData('x');

      expect(mockGet).toHaveBeenCalledTimes(2);
    });

    it('fresh-window lapse → OLD value returned + client.get called 2x (background refresh)', async () => {
      const spy = jest.fn().mockResolvedValue(mockData);
      const mockGet = jest.fn().mockResolvedValue(JSON.stringify(mockData));
      const client = createMockClient({ get: mockGet });
      const service = createSpyService(client, spy, 'l6');

      await service.getData('x');
      now += 61_000;
      await service.getData('x');

      expect(mockGet).toHaveBeenCalledTimes(2);
    });

    it('custom deserialize applied on local hits too', async () => {
      const spy = jest.fn().mockResolvedValue(mockData);
      const mockGet = jest.fn().mockResolvedValue(JSON.stringify(mockData));
      const client = createMockClient({ get: mockGet });
      const service = createSpyService(client, spy, 'l7', {
        deserialize: (raw: string) => ({ ...JSON.parse(raw), deserialized: true }),
      });

      const first = await service.getData('x');
      const second = await service.getData('x');

      expect(first).toEqual({ ...mockData, deserialized: true });
      expect(second).toEqual({ ...mockData, deserialized: true });
      expect(mockGet).toHaveBeenCalledTimes(1);
    });

    it('deserialize throwing on local hit falls back to Redis path', async () => {
      const spy = jest.fn().mockResolvedValue(mockData);
      const mockGet = jest.fn().mockResolvedValue(JSON.stringify(mockData));
      const client = createMockClient({ get: mockGet });
      const deserialize = jest.fn()
        .mockImplementationOnce((raw: string) => JSON.parse(raw))
        .mockImplementationOnce(() => { throw new Error('DESERIALIZE_FAIL'); })
        .mockImplementation((raw: string) => JSON.parse(raw));
      const service = createSpyService(client, spy, 'l8', { deserialize });

      await service.getData('x');
      const second = await service.getData('x');

      expect(second).toEqual(mockData);
      expect(mockGet).toHaveBeenCalledTimes(2);
    });

    it('reference isolation — mutating returned object does not pollute cache', async () => {
      const spy = jest.fn().mockResolvedValue(mockData);
      const client = createMockClient();
      const service = createSpyService(client, spy, 'l9');

      await service.getData('x');
      const second = (await service.getData('x')) as Record<string, unknown>;
      second.title = 'mutated';
      const third = await service.getData('x');

      expect(third).toEqual(mockData);
    });

    it('different keys cached independently', async () => {
      const spy = jest.fn().mockResolvedValue(mockData);
      const client = createMockClient();
      const service = createSpyService(client, spy, 'l10');

      await service.getData('EVENT');
      await service.getData('MAIN');
      await service.getData('EVENT');
      await service.getData('MAIN');

      expect(spy).toHaveBeenCalledTimes(2);
    });

    it('null origin result cached as "null", served without re-executing origin', async () => {
      const spy = jest.fn().mockResolvedValue(null);
      const client = createMockClient();
      const service = createSpyService(client, spy, 'l11');

      const first = await service.getData('x');
      const second = await service.getData('x');

      expect(first).toBeNull();
      expect(second).toBeNull();
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe('stale-while-revalidate', () => {
    it('fresh window → no background refresh', async () => {
      const spy = jest.fn().mockResolvedValue(mockData);
      const client = createMockClient();
      const service = createSpyService(client, spy, 's1');

      await service.getData('x');
      now += 30_000;
      await service.getData('x');
      await flushAsync();

      expect((client.get as jest.Mock)).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('stale hit → old value immediately, after flush serves refreshed value, spy stays 1', async () => {
      const spy = jest.fn().mockResolvedValue(mockData);
      const mockGet = jest.fn().mockResolvedValue(null);
      const client = createMockClient({ get: mockGet });
      const service = createSpyService(client, spy, 's2');

      await service.getData('x');
      now += 61_000;
      mockGet.mockResolvedValue(JSON.stringify(freshData));

      const stale = await service.getData('x');
      expect(stale).toEqual(mockData);

      await flushAsync();

      const after = await service.getData('x');
      expect(after).toEqual(freshData);
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('concurrent stale hits → exactly ONE refresh dispatched (inflight dedup)', async () => {
      const spy = jest.fn().mockResolvedValue(mockData);
      const client = createMockClient();
      const service = createSpyService(client, spy, 's3');

      await service.getData('x');
      now += 61_000;

      const [first, second] = await Promise.all([service.getData('x'), service.getData('x')]);
      await flushAsync();

      expect(first).toEqual(mockData);
      expect(second).toEqual(mockData);
      expect((client.get as jest.Mock)).toHaveBeenCalledTimes(2);
    });

    it('refresh fails → stale still served, no error propagated, retry possible', async () => {
      const spy = jest.fn().mockResolvedValue(mockData);
      const mockGet = jest.fn().mockResolvedValue(null);
      const client = createMockClient({ get: mockGet });
      const service = createSpyService(client, spy, 's4');

      await service.getData('x');
      now += 61_000;
      mockGet.mockRejectedValue(new Error('REDIS_DOWN'));
      spy.mockRejectedValue(new Error('DB_DOWN'));

      const stale1 = await service.getData('x');
      expect(stale1).toEqual(mockData);

      await flushAsync();

      const stale2 = await service.getData('x');
      expect(stale2).toEqual(mockData);
      expect(spy.mock.calls.length).toBeGreaterThanOrEqual(2);
    });

    it('localCacheMaxStaleSeconds=0 → no stale serving, synchronous re-fetch at 61s', async () => {
      const spy = jest.fn().mockResolvedValue(mockData);
      const mockGet = jest.fn().mockResolvedValue(JSON.stringify(mockData));
      const client = createMockClient({ get: mockGet });
      const service = createSpyService(client, spy, 's5', { localCacheMaxStaleSeconds: 0 });

      await service.getData('x');
      now += 61_000;
      await service.getData('x');

      expect(mockGet).toHaveBeenCalledTimes(2);
    });

    it('past staleUntil → full miss, synchronous path', async () => {
      const spy = jest.fn().mockResolvedValue(mockData);
      const client = createMockClient();
      const service = createSpyService(client, spy, 's6', { localCacheMaxStaleSeconds: 120 });

      await service.getData('x');
      now += 60_000 + 120_000 + 1_000;

      const result = await service.getData('x');
      expect(result).toEqual(mockData);
      expect(spy).toHaveBeenCalledTimes(2);
    });

    it('client-less twin returns stale value but skips refresh', async () => {
      const spy = jest.fn().mockResolvedValue(mockData);
      const client = createMockClient();

      // Service A: has client — used to populate the local cache
      class ServiceA {
        [CACHE_CLIENT] = client;

        @MethodCache({ prefix: 's7', ttlSeconds: 600 })
        async getData(key: string): Promise<unknown> {
          return spy(key);
        }
      }

      // Service B: NO client — twin with same prefix
      class ServiceB {
        @MethodCache({ prefix: 's7', ttlSeconds: 600 })
        async getData(key: string): Promise<unknown> {
          return spy(key);
        }
      }

      const serviceA = new ServiceA();
      const serviceB = new ServiceB();

      await serviceA.getData('x');
      now += 61_000;

      const stale = await serviceB.getData('x');
      await flushAsync();

      expect(stale).toEqual(mockData);
      expect(spy).toHaveBeenCalledTimes(1);
      expect((client.get as jest.Mock)).toHaveBeenCalledTimes(1);
    });

    it('deserialize applied to stale values too', async () => {
      const spy = jest.fn().mockResolvedValue(mockData);
      const client = createMockClient();

      class TestService {
        [CACHE_CLIENT] = client;

        @MethodCache({
          prefix: 's8',
          ttlSeconds: 600,
          deserialize: (raw: string) => ({ ...JSON.parse(raw), deserialized: true }),
        })
        async getData(): Promise<unknown> {
          return spy();
        }
      }

      const service = new TestService();

      await service.getData();
      now += 61_000;

      const stale = await service.getData();
      expect(stale).toEqual({ ...mockData, deserialized: true });
    });

    it('@InvalidateMethodCache then call → no stale serving, synchronous re-fetch', async () => {
      const spy = jest.fn().mockResolvedValue(mockData);
      const client = createMockClient();
      const service = createSpyService(client, spy, 's9');

      class Invalidator {
        [CACHE_CLIENT] = client;

        @InvalidateMethodCache({ prefixes: 's9' })
        async invalidate(): Promise<unknown> {
          return 'ok';
        }
      }

      await service.getData('x');
      now += 61_000;
      await new Invalidator().invalidate();

      const result = await service.getData('x');
      expect(result).toEqual(mockData);
      expect(spy).toHaveBeenCalledTimes(2);
    });

    it('full-miss caller joining a failing in-flight refresh shares its rejection', async () => {
      let rejectFn!: (err: Error) => void;
      const deferred = new Promise<unknown>((_, rej) => {
        rejectFn = rej;
      });

      const spy = jest.fn()
        .mockResolvedValueOnce(mockData)
        .mockReturnValueOnce(deferred);

      const client = createMockClient();
      const service = createSpyService(client, spy, 's10', {
        ttlSeconds: 600,
        localCacheMaxStaleSeconds: 30,
      });

      // Populate at t0
      await service.getData('x');

      // Advance past freshUntil (61s) → stale hit dispatches refresh
      now += 61_000;
      const staleResult = await service.getData('x');
      expect(staleResult).toEqual(mockData);

      // Advance past staleUntil (91s total) → full local miss
      now += 30_000;
      const callB = service.getData('x');

      // Reject the deferred — refresh fails
      rejectFn(new Error('REFRESH_FAIL'));

      await expect(callB).rejects.toThrow('REFRESH_FAIL');
    });
  });

  describe('derived-default matrix', () => {
    it('ttlSeconds=600 at 599s → stale served + background refresh', async () => {
      const spy = jest.fn().mockResolvedValue(mockData);
      const mockGet = jest.fn().mockResolvedValue(null);
      const client = createMockClient({ get: mockGet });
      const service = createSpyService(client, spy, 'd1');

      await service.getData('x');
      now += 599_000;
      mockGet.mockResolvedValue(JSON.stringify(freshData));

      const stale = await service.getData('x');
      expect(stale).toEqual(mockData);

      await flushAsync();

      const after = await service.getData('x');
      expect(after).toEqual(freshData);
    });

    it('ttlSeconds=600 at exactly 600s → full miss, synchronous re-fetch (gap-regression guard)', async () => {
      const spy = jest.fn().mockResolvedValue(mockData);
      const client = createMockClient();
      const service = createSpyService(client, spy, 'd2');

      await service.getData('x');
      now += 600_000;
      spy.mockResolvedValue(freshData);

      const result = await service.getData('x');

      expect(result).toEqual(freshData);
      expect(spy).toHaveBeenCalledTimes(2);
      expect((client.get as jest.Mock)).toHaveBeenCalledTimes(2);
    });

    it('ttlSeconds=3600 at 3599s → stale served', async () => {
      const spy = jest.fn().mockResolvedValue(mockData);
      const client = createMockClient();
      const service = createSpyService(client, spy, 'd3', { ttlSeconds: 3600 });

      await service.getData('x');
      now += 3_599_000;
      spy.mockResolvedValue(freshData);

      const stale = await service.getData('x');
      expect(stale).toEqual(mockData);
    });

    it('ttlSeconds=3600 at 3600s → full miss', async () => {
      const spy = jest.fn().mockResolvedValue(mockData);
      const client = createMockClient();
      const service = createSpyService(client, spy, 'd4', { ttlSeconds: 3600 });

      await service.getData('x');
      now += 3_600_000;
      spy.mockResolvedValue(freshData);

      const result = await service.getData('x');
      expect(result).toEqual(freshData);
      expect(spy).toHaveBeenCalledTimes(2);
    });

    it('ttlSeconds=60 (== default localTtl) → zero stale window, 60s is a full miss', async () => {
      const spy = jest.fn().mockResolvedValue(mockData);
      const client = createMockClient();
      const service = createSpyService(client, spy, 'd5', { ttlSeconds: 60 });

      await service.getData('x');
      now += 60_000;
      spy.mockResolvedValue(freshData);

      const result = await service.getData('x');
      expect(result).toEqual(freshData);
      expect(spy).toHaveBeenCalledTimes(2);
    });

    it('clamp pin — ttlSeconds=30 < default localTtl → effective localTtl clamped to 30', async () => {
      const spy = jest.fn().mockResolvedValue(mockData);
      const client = createMockClient();
      const service = createSpyService(client, spy, 'd6', { ttlSeconds: 30 });

      await service.getData('x');

      // 29s: still fresh (< clamped 30s TTL) → local hit, no Redis call
      now += 29_000;
      const fresh = await service.getData('x');
      expect(fresh).toEqual(mockData);
      expect((client.get as jest.Mock)).toHaveBeenCalledTimes(1);

      // 31s total: past clamped freshUntil (30s), maxStale=0 → expired, full miss
      now += 2_000;
      const result = await service.getData('x');
      expect(result).toEqual(mockData);
      expect(spy).toHaveBeenCalledTimes(2);
    });

    it('explicit localCacheMaxStaleSeconds=600 overrides derived value (stale at 659s)', async () => {
      const spy = jest.fn().mockResolvedValue(mockData);
      const client = createMockClient();
      const service = createSpyService(client, spy, 'd7', { localCacheMaxStaleSeconds: 600 });

      await service.getData('x');
      now += 659_000;
      spy.mockResolvedValue(freshData);

      const stale = await service.getData('x');
      expect(stale).toEqual(mockData);
    });

    it('ttlSeconds=600 at exactly 60s → >= boundary fires stale/refresh branch', async () => {
      const spy = jest.fn().mockResolvedValue(mockData);
      const client = createMockClient();
      const service = createSpyService(client, spy, 'd8');

      await service.getData('x');
      now += 60_000;
      spy.mockResolvedValue(freshData);

      const result = await service.getData('x');
      await flushAsync();

      expect(result).toEqual(mockData);
      expect((client.get as jest.Mock)).toHaveBeenCalledTimes(2);
    });
  });
});
