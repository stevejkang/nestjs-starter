import {
  localCacheGet,
  localCacheSet,
  clearLocalCache,
} from '../LocalCache';

describe('LocalCache', () => {
  let now: number;

  beforeEach(() => {
    clearLocalCache();
    now = 1_000_000_000;
    jest.spyOn(Date, 'now').mockImplementation(() => now);
  });

  afterEach(() => {
    clearLocalCache();
    jest.restoreAllMocks();
  });

  it('should return undefined on empty map', () => {
    expect(localCacheGet('nonexistent')).toBeUndefined();
  });

  it('should return fresh hit within fresh window', () => {
    localCacheSet('key', '"hello"', 60, 30);

    const hit = localCacheGet('key');

    expect(hit).toEqual({ value: '"hello"', isStale: false });
  });

  it('should return stale at exactly freshUntil boundary (>=)', () => {
    localCacheSet('key', '"val"', 60, 30);

    now += 60 * 1000;
    const hit = localCacheGet('key');

    expect(hit).toEqual({ value: '"val"', isStale: true });
  });

  it('should return stale between fresh and stale windows', () => {
    localCacheSet('key', '"val"', 60, 30);

    now += 70 * 1000;
    const hit = localCacheGet('key');

    expect(hit).toEqual({ value: '"val"', isStale: true });
  });

  it('should delete and return undefined at exactly staleUntil boundary (>=)', () => {
    localCacheSet('key', '"val"', 60, 30);

    now += 90 * 1000;
    const hit = localCacheGet('key');

    expect(hit).toBeUndefined();
    expect(localCacheGet('key')).toBeUndefined();
  });

  it('should not store when ttlSeconds <= 0', () => {
    localCacheSet('key', '"val"', 0, 30);

    expect(localCacheGet('key')).toBeUndefined();
  });

  it('should not store when ttlSeconds is negative', () => {
    localCacheSet('key', '"val"', -5, 30);

    expect(localCacheGet('key')).toBeUndefined();
  });

  it('should clamp negative maxStaleSeconds to 0', () => {
    localCacheSet('key', '"val"', 60, -10);

    now += 60 * 1000;
    const hit = localCacheGet('key');

    expect(hit).toBeUndefined();
  });

  it('should clear all entries when no prefix given', () => {
    localCacheSet('a', '"1"', 60, 30);
    localCacheSet('b', '"2"', 60, 30);

    clearLocalCache();

    expect(localCacheGet('a')).toBeUndefined();
    expect(localCacheGet('b')).toBeUndefined();
  });

  it('should clear exact key and colon-prefixed keys, preserving unrelated entries', () => {
    localCacheSet('user', '"exact"', 60, 30);
    localCacheSet('user:1', '"u1"', 60, 30);
    localCacheSet('user:2', '"u2"', 60, 30);
    localCacheSet('user-profile:1', '"up1"', 60, 30);
    localCacheSet('other:1', '"o1"', 60, 30);

    clearLocalCache('user');

    expect(localCacheGet('user')).toBeUndefined();
    expect(localCacheGet('user:1')).toBeUndefined();
    expect(localCacheGet('user:2')).toBeUndefined();
    expect(localCacheGet('user-profile:1')).toEqual({
      value: '"up1"',
      isStale: false,
    });
    expect(localCacheGet('other:1')).toEqual({
      value: '"o1"',
      isStale: false,
    });
  });

  it('should preserve value identity (stored string returned as-is)', () => {
    const stored = '{"nested":{"key":"value"}}';
    localCacheSet('key', stored, 60, 30);

    const hit = localCacheGet('key');

    expect(hit?.value).toBe(stored);
  });
});
