import { buildCacheKey } from '../CacheKeyBuilder';

describe('CacheKeyBuilder', () => {
  describe('basic key generation', () => {
    it('should build key from prefix and string arguments', () => {
      const key = buildCacheKey('user', ['123']);

      expect(key).toBe('user:123');
    });

    it('should build key from prefix and multiple arguments', () => {
      const key = buildCacheKey('user', ['123', 'profile']);

      expect(key).toBe('user:123:profile');
    });

    it('should build key with prefix only when no arguments given', () => {
      const key = buildCacheKey('all-users', []);

      expect(key).toBe('all-users');
    });
  });

  describe('selective key arguments', () => {
    it('should include only specified argument indices', () => {
      const key = buildCacheKey('item', ['a', 'b', 'c'], [0, 2]);

      expect(key).toBe('item:a:c');
    });

    it('should ignore out-of-bounds indices gracefully', () => {
      const key = buildCacheKey('item', ['a'], [0, 5]);

      expect(key).toBe('item:a');
    });
  });

  describe('argument type handling', () => {
    it('should serialize number arguments', () => {
      const key = buildCacheKey('order', [42, 3.14]);

      expect(key).toBe('order:42:3.14');
    });

    it('should serialize boolean arguments', () => {
      const key = buildCacheKey('flag', [true, false]);

      expect(key).toBe('flag:true:false');
    });

    it('should serialize null and undefined as stable strings', () => {
      const key = buildCacheKey('nullable', [null, undefined]);

      expect(key).toBe('nullable:null:undefined');
    });

    it('should serialize plain objects deterministically', () => {
      const objA = { z: 1, a: 2 };
      const objB = { a: 2, z: 1 };

      expect(buildCacheKey('obj', [objA])).toBe(buildCacheKey('obj', [objB]));
    });

    it('should serialize arrays', () => {
      const key = buildCacheKey('list', [[1, 2, 3]]);

      expect(key).toBe('list:[1,2,3]');
    });

    it('should handle nested objects deterministically', () => {
      const nested = { b: { d: 1, c: 2 }, a: 3 };

      const key = buildCacheKey('nested', [nested]);

      expect(key).toBe(buildCacheKey('nested', [{ a: 3, b: { c: 2, d: 1 } }]));
    });
  });

  describe('determinism guarantee', () => {
    it('should produce identical keys for identical inputs across calls', () => {
      const args = ['hello', 42, { key: 'val' }];

      const key1 = buildCacheKey('test', args);
      const key2 = buildCacheKey('test', args);

      expect(key1).toBe(key2);
    });
  });
});
