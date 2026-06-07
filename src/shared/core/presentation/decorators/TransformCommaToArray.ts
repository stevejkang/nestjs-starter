import { Transform } from 'class-transformer';

export const TransformCommaToArray = (): PropertyDecorator =>
  Transform(({ value }: { value: unknown }) => {
    if (Array.isArray(value)) {
      return value.map((item: unknown) => String(item));
    }

    if (typeof value === 'string') {
      return value.split(',').map((item) => item.trim());
    }

    return [String(value)];
  });
