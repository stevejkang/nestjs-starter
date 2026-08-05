import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { RedisCacheModule } from '../RedisCacheModule';
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

describe('RedisCacheModule', () => {
  describe('forRoot with a provided client', () => {
    it('should expose the provided client under the CACHE_CLIENT token', async () => {
      const client = createMockClient();

      const moduleRef = await Test.createTestingModule({
        imports: [RedisCacheModule.forRoot({ client })],
      }).compile();

      expect(moduleRef.get<CacheClient>(CACHE_CLIENT)).toBe(client);
    });

    it('should not emit a warning when a client is provided', () => {
      const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();

      RedisCacheModule.forRoot({ client: createMockClient() });

      expect(warnSpy).not.toHaveBeenCalled();

      warnSpy.mockRestore();
    });
  });

  describe('forRoot without a client (no-op fallback)', () => {
    it('should fall back to a no-op client when no client is given', async () => {
      jest.spyOn(Logger.prototype, 'warn').mockImplementation();

      const moduleRef = await Test.createTestingModule({
        imports: [RedisCacheModule.forRoot()],
      }).compile();

      const client = moduleRef.get<CacheClient>(CACHE_CLIENT);

      expect(client).toBeDefined();

      jest.restoreAllMocks();
    });

    it('should fall back to a no-op client when options omit the client key', async () => {
      jest.spyOn(Logger.prototype, 'warn').mockImplementation();

      const moduleRef = await Test.createTestingModule({
        imports: [RedisCacheModule.forRoot({})],
      }).compile();

      expect(moduleRef.get<CacheClient>(CACHE_CLIENT)).toBeDefined();

      jest.restoreAllMocks();
    });

    it('should warn that caching is disabled', () => {
      const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();

      RedisCacheModule.forRoot();

      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('caching is disabled'));

      warnSpy.mockRestore();
    });
  });

  describe('no-op client behaviour', () => {
    let client: CacheClient;

    beforeEach(async () => {
      jest.spyOn(Logger.prototype, 'warn').mockImplementation();

      const moduleRef = await Test.createTestingModule({
        imports: [RedisCacheModule.forRoot()],
      }).compile();

      client = moduleRef.get<CacheClient>(CACHE_CLIENT);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should always return null from get, so every lookup is a cache miss', async () => {
      await expect(client.get('any-key')).resolves.toBeNull();
    });

    it('should return null from get even after a set', async () => {
      await client.set('key', 'value', 60);

      await expect(client.get('key')).resolves.toBeNull();
    });

    it('should resolve set without throwing', async () => {
      await expect(client.set('key', 'value', 60)).resolves.toBeUndefined();
    });

    it('should resolve del without throwing', async () => {
      await expect(client.del(['key-a', 'key-b'])).resolves.toBeUndefined();
    });

    it('should resolve sadd without throwing', async () => {
      await expect(client.sadd('registry', 'key-a')).resolves.toBeUndefined();
    });

    it('should always return an empty array from smembers', async () => {
      await client.sadd('registry', 'key-a');

      await expect(client.smembers('registry')).resolves.toEqual([]);
    });
  });

  describe('dynamic module shape', () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should be registered as a global module', () => {
      const dynamicModule = RedisCacheModule.forRoot({ client: createMockClient() });

      expect(dynamicModule.global).toBe(true);
      expect(dynamicModule.module).toBe(RedisCacheModule);
    });

    it('should export the CACHE_CLIENT token', () => {
      const dynamicModule = RedisCacheModule.forRoot({ client: createMockClient() });

      expect(dynamicModule.exports).toContain(CACHE_CLIENT);
    });
  });
});
