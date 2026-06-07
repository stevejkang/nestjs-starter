import { Transform } from 'class-transformer';

const toValues = (value: unknown): unknown[] => {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === 'string') {
    return value.split(',');
  }

  return [value];
};

export const TransformToNumberArray = (): PropertyDecorator =>
  Transform(({ value }: { value: unknown }) =>
    toValues(value)
      .map((item) => Number(typeof item === 'string' ? item.trim() : item))
      .filter((item) => !Number.isNaN(item)),
  );
