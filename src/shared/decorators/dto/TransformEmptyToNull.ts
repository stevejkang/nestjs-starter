import { Transform } from 'class-transformer';

export const TransformEmptyToNull = (): PropertyDecorator =>
  Transform(({ value }: { value: unknown }) => (value === '' ? null : value));
