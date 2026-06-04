import { ValueTransformer } from 'typeorm';

export class BooleanIntegerTransformer implements ValueTransformer {
  from(value: number | null): boolean | null {
    if (value === null) {
      return null;
    }

    return value !== 0;
  }

  to(value: boolean | null): number | null {
    if (value === null) {
      return null;
    }

    return value ? 1 : 0;
  }
}
