import { Transform } from 'class-transformer';
import { BadRequestException } from '@nestjs/common';

export const TransformToNumber = (): PropertyDecorator =>
  Transform(({ value }: { value: unknown }) => {
    if (value === undefined || value === null) {
      return value;
    }

    const result = Number(value);

    if (Number.isNaN(result)) {
      throw new BadRequestException('Invalid number value');
    }

    return result;
  });
