import { BigIntTransformer } from '../BigIntTransformer';

describe('BigIntTransformer', () => {
  let transformer: BigIntTransformer;

  beforeEach(() => {
    transformer = new BigIntTransformer();
  });

  describe('from (database → application)', () => {
    it('should convert string to number', () => {
      expect(transformer.from('123')).toBe(123);
    });

    it('should pass through number as-is', () => {
      expect(transformer.from(456)).toBe(456);
    });

    it('should convert null to null', () => {
      expect(transformer.from(null)).toBeNull();
    });

    it('should lose precision for values above Number.MAX_SAFE_INTEGER', () => {
      const unsafeValue = '9007199254740993'; // 2^53 + 1
      const result = transformer.from(unsafeValue);

      expect(typeof result).toBe('number');
      expect(Number.isSafeInteger(result)).toBe(false);
    });
  });

  describe('to (application → database)', () => {
    it('should pass through number as-is', () => {
      expect(transformer.to(789)).toBe(789);
    });

    it('should pass through null as-is', () => {
      expect(transformer.to(null)).toBeNull();
    });
  });
});
