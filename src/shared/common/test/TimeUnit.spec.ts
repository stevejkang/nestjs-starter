import { TimeUnit } from '../TimeUnit';

describe('TimeUnit', () => {
  describe('factory methods', () => {
    it('should create a duration from milliseconds', () => {
      expect(TimeUnit.fromMilliseconds(1500).toMilliseconds()).toEqual(1500);
    });

    it('should create a duration from seconds', () => {
      expect(TimeUnit.fromSeconds(90).toMilliseconds()).toEqual(90000);
    });

    it('should create a duration from minutes', () => {
      expect(TimeUnit.fromMinutes(5).toMilliseconds()).toEqual(300000);
    });

    it('should create a duration from hours', () => {
      expect(TimeUnit.fromHours(2).toMilliseconds()).toEqual(7200000);
    });

    it('should create a duration from days', () => {
      expect(TimeUnit.fromDays(3).toMilliseconds()).toEqual(259200000);
    });
  });

  describe('conversion methods', () => {
    it('should convert to milliseconds', () => {
      expect(TimeUnit.fromDays(1).toMilliseconds()).toEqual(86400000);
      expect(TimeUnit.fromHours(1).toMilliseconds()).toEqual(3600000);
      expect(TimeUnit.fromMinutes(1).toMilliseconds()).toEqual(60000);
      expect(TimeUnit.fromSeconds(1).toMilliseconds()).toEqual(1000);
    });

    it('should convert to seconds using whole units', () => {
      expect(TimeUnit.fromMilliseconds(1999).toSeconds()).toEqual(1);
      expect(TimeUnit.fromMinutes(2).toSeconds()).toEqual(120);
    });

    it('should convert to minutes using whole units', () => {
      expect(TimeUnit.fromSeconds(90).toMinutes()).toEqual(1);
      expect(TimeUnit.fromHours(2).toMinutes()).toEqual(120);
    });

    it('should convert to hours using whole units', () => {
      expect(TimeUnit.fromMinutes(119).toHours()).toEqual(1);
      expect(TimeUnit.fromDays(2).toHours()).toEqual(48);
    });
  });

  describe('edge cases', () => {
    it('should support zero values', () => {
      const duration = TimeUnit.fromMilliseconds(0);

      expect(duration.toMilliseconds()).toEqual(0);
      expect(duration.toSeconds()).toEqual(0);
      expect(duration.toMinutes()).toEqual(0);
      expect(duration.toHours()).toEqual(0);
    });

    it('should support large values', () => {
      const duration = TimeUnit.fromDays(365);

      expect(duration.toMilliseconds()).toEqual(31536000000);
      expect(duration.toSeconds()).toEqual(31536000);
      expect(duration.toMinutes()).toEqual(525600);
      expect(duration.toHours()).toEqual(8760);
    });

    it('should preserve sub-second precision in milliseconds', () => {
      const duration = TimeUnit.fromSeconds(1.5);

      expect(duration.toMilliseconds()).toEqual(1500);
      expect(duration.toSeconds()).toEqual(1);
    });

    it('should create immutable instances', () => {
      const duration = TimeUnit.fromMinutes(1);

      expect(Object.isFrozen(duration)).toEqual(true);
    });

    it('should reject negative values', () => {
      expect(() => TimeUnit.fromMilliseconds(-1)).toThrow(RangeError);
    });

    it('should reject non-finite values', () => {
      expect(() => TimeUnit.fromSeconds(Number.POSITIVE_INFINITY)).toThrow(
        RangeError,
      );
      expect(() => TimeUnit.fromSeconds(Number.NaN)).toThrow(RangeError);
    });
  });
});
