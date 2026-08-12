import { ValueTransformer } from 'typeorm';

export class BigIntTransformer implements ValueTransformer {
  /**
   * Converts DB bigint strings to JS numbers.
   * Values above Number.MAX_SAFE_INTEGER (2^53-1) lose precision —
   * acceptable for auto-increment IDs; do not use for arbitrary 64-bit values.
   */
  from(value: string | number | null): number | null {
    if (value === null) {
      return null;
    }

    return Number(value);
  }

  to(value: number | null): number | null {
    return value;
  }
}
