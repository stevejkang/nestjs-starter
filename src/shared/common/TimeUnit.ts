export type TimeUnitSymbol = 'ms' | 's' | 'm' | 'h' | 'd';

export class TimeUnit {
  private static readonly MILLISECONDS_BY_UNIT: Record<TimeUnitSymbol, number> = {
    ms: 1,
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  private constructor(private readonly milliseconds: number) {
    Object.freeze(this);
  }

  static fromMilliseconds(value: number): TimeUnit {
    return TimeUnit.from(value, 'ms');
  }

  static fromSeconds(value: number): TimeUnit {
    return TimeUnit.from(value, 's');
  }

  static fromMinutes(value: number): TimeUnit {
    return TimeUnit.from(value, 'm');
  }

  static fromHours(value: number): TimeUnit {
    return TimeUnit.from(value, 'h');
  }

  static fromDays(value: number): TimeUnit {
    return TimeUnit.from(value, 'd');
  }

  toMilliseconds(): number {
    return Math.floor(this.milliseconds);
  }

  toSeconds(): number {
    return this.toWholeUnit('s');
  }

  toMinutes(): number {
    return this.toWholeUnit('m');
  }

  toHours(): number {
    return this.toWholeUnit('h');
  }

  private static from(value: number, unit: TimeUnitSymbol): TimeUnit {
    TimeUnit.assertValidValue(value);

    return new TimeUnit(value * TimeUnit.MILLISECONDS_BY_UNIT[unit]);
  }

  private static assertValidValue(value: number): void {
    if (!Number.isFinite(value) || value < 0) {
      throw new RangeError('TimeUnit value must be a finite non-negative number');
    }
  }

  private toWholeUnit(unit: Exclude<TimeUnitSymbol, 'ms' | 'd'>): number {
    return Math.floor(this.milliseconds / TimeUnit.MILLISECONDS_BY_UNIT[unit]);
  }
}
