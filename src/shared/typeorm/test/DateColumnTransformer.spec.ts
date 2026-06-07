import dayjs from 'dayjs';
import { DateColumnTransformer } from '../DateColumnTransformer';

describe('DateColumnTransformer', () => {
  let transformer: DateColumnTransformer;

  beforeEach(() => {
    transformer = new DateColumnTransformer();
  });

  describe('to (application → database)', () => {
    it('should convert a Date to start of day', () => {
      const input = new Date(2024, 5, 15, 14, 30, 45, 123);
      const result = transformer.to(input);

      expect(result).toEqual(dayjs(input).startOf('day').toDate());
    });

    it('should convert a date string to start of day', () => {
      const input = '2024-06-15T14:30:45.123Z';
      const transformer = new DateColumnTransformer<string>();
      const result = transformer.to(input);

      expect(result).toEqual(dayjs(input).startOf('day').toDate());
    });

    it('should strip time components from Date', () => {
      const input = new Date(2024, 0, 1, 23, 59, 59, 999);
      const result = transformer.to(input) as Date;

      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
      expect(result.getSeconds()).toBe(0);
      expect(result.getMilliseconds()).toBe(0);
    });

    it('should return null for null input', () => {
      const transformer = new DateColumnTransformer<Date | null>();

      expect(transformer.to(null)).toBeNull();
    });

    it('should return undefined for undefined input', () => {
      const result = transformer.to(undefined as unknown as Date);

      expect(result).toBeUndefined();
    });

    it('should throw on unsupported input type', () => {
      expect(() => transformer.to(123 as unknown as Date)).toThrow(
        'Unsupported input type for DateColumnTransformer',
      );
    });
  });

  describe('from (database → application)', () => {
    it('should convert a Date to start of day', () => {
      const input = new Date(2024, 5, 15, 14, 30, 45, 123);
      const result = transformer.from(input);

      expect(result).toEqual(dayjs(input).startOf('day').toDate());
    });

    it('should convert a date string to start of day', () => {
      const input = '2024-06-15T14:30:45.123Z';
      const transformer = new DateColumnTransformer<string>();
      const result = transformer.from(input);

      expect(result).toEqual(dayjs(input).startOf('day').toDate());
    });

    it('should strip time components from Date', () => {
      const input = new Date(2024, 0, 1, 23, 59, 59, 999);
      const result = transformer.from(input) as Date;

      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
      expect(result.getSeconds()).toBe(0);
      expect(result.getMilliseconds()).toBe(0);
    });

    it('should return null for null input', () => {
      const transformer = new DateColumnTransformer<Date | null>();

      expect(transformer.from(null)).toBeNull();
    });

    it('should throw on undefined input', () => {
      expect(() => transformer.from(undefined as unknown as Date)).toThrow(
        'Unsupported input type for DateColumnTransformer',
      );
    });

    it('should throw on unsupported input type', () => {
      expect(() => transformer.from(123 as unknown as Date)).toThrow(
        'Unsupported input type for DateColumnTransformer',
      );
    });
  });
});
