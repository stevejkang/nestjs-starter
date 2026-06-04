import { Transform } from 'class-transformer';
import { BadRequestException } from '@nestjs/common';

const TRUE_VALUES = new Set<unknown>([true, 1, 'true', '1', 'yes', 'on']);
const FALSE_VALUES = new Set<unknown>([false, 0, 'false', '0', 'no', 'off']);

const normalizeValue = (value: unknown): unknown =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export const TransformToBoolean = (): PropertyDecorator =>
  Transform(({ value }: { value: unknown }) => {
    const normalizedValue = normalizeValue(value);

    if (TRUE_VALUES.has(normalizedValue)) {
      return true;
    }

    if (FALSE_VALUES.has(normalizedValue)) {
      return false;
    }

    throw new BadRequestException('Invalid boolean value');
  });
