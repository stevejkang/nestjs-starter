import { DateTimeColumnTransformer } from '../DateTimeColumnTransformer';

describe('DateTimeColumnTransformer', () => {
  let transformer: DateTimeColumnTransformer;

  beforeEach(() => {
    transformer = new DateTimeColumnTransformer();
  });

  describe('to (application → database)', () => {
    it('should return the same Date instance', () => {
      const input = new Date(2024, 5, 15, 14, 30, 45, 123);
      const result = transformer.to(input);

      expect(result).toBe(input);
    });

    it('should convert a date string to Date', () => {
      const input = '2024-06-15T14:30:45.123Z';
      const transformer = new DateTimeColumnTransformer<string>();
      const result = transformer.to(input);

      expect(result).toEqual(new Date(input));
    });

    it('should preserve time components', () => {
      const input = new Date(2024, 5, 15, 14, 30, 45, 123);
      const result = transformer.to(input) as Date;

      expect(result.getHours()).toBe(14);
      expect(result.getMinutes()).toBe(30);
      expect(result.getSeconds()).toBe(45);
      expect(result.getMilliseconds()).toBe(123);
    });

    it('should return null for null input', () => {
      const transformer = new DateTimeColumnTransformer<Date | null>();

      expect(transformer.to(null)).toBeNull();
    });

    it('should return undefined for undefined input', () => {
      const result = transformer.to(undefined as unknown as Date);

      expect(result).toBeUndefined();
    });

    it('should throw on unsupported input type', () => {
      expect(() => transformer.to(123 as unknown as Date)).toThrow(
        'Unsupported input type for DateTimeColumnTransformer',
      );
    });
  });

  describe('from (database → application)', () => {
    it('should return the same Date instance', () => {
      const input = new Date(2024, 5, 15, 14, 30, 45, 123);
      const result = transformer.from(input);

      expect(result).toBe(input);
    });

    it('should convert a date string to Date', () => {
      const input = '2024-06-15T14:30:45.123Z';
      const transformer = new DateTimeColumnTransformer<string>();
      const result = transformer.from(input);

      expect(result).toEqual(new Date(input));
    });

    it('should preserve time components', () => {
      const input = new Date(2024, 5, 15, 14, 30, 45, 123);
      const result = transformer.from(input) as Date;

      expect(result.getHours()).toBe(14);
      expect(result.getMinutes()).toBe(30);
      expect(result.getSeconds()).toBe(45);
      expect(result.getMilliseconds()).toBe(123);
    });

    it('should return null for null input', () => {
      const transformer = new DateTimeColumnTransformer<Date | null>();

      expect(transformer.from(null)).toBeNull();
    });

    it('should throw on undefined input', () => {
      expect(() => transformer.from(undefined as unknown as Date)).toThrow(
        'Unsupported input type for DateTimeColumnTransformer',
      );
    });

    it('should throw on unsupported input type', () => {
      expect(() => transformer.from(123 as unknown as Date)).toThrow(
        'Unsupported input type for DateTimeColumnTransformer',
      );
    });
  });
});
