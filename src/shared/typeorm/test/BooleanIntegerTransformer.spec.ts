import { BooleanIntegerTransformer } from '../BooleanIntegerTransformer';

describe('BooleanIntegerTransformer', () => {
  let transformer: BooleanIntegerTransformer;

  beforeEach(() => {
    transformer = new BooleanIntegerTransformer();
  });

  describe('from (database → application)', () => {
    it('should convert 1 to true', () => {
      expect(transformer.from(1)).toBe(true);
    });

    it('should convert 0 to false', () => {
      expect(transformer.from(0)).toBe(false);
    });

    it('should convert null to null', () => {
      expect(transformer.from(null)).toBeNull();
    });

    it('should convert non-zero numbers to true', () => {
      expect(transformer.from(2)).toBe(true);
      expect(transformer.from(-1)).toBe(true);
      expect(transformer.from(42)).toBe(true);
    });
  });

  describe('to (application → database)', () => {
    it('should convert true to 1', () => {
      expect(transformer.to(true)).toBe(1);
    });

    it('should convert false to 0', () => {
      expect(transformer.to(false)).toBe(0);
    });

    it('should convert null to null', () => {
      expect(transformer.to(null)).toBeNull();
    });
  });
});
