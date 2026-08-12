import { Column, ColumnOptions } from 'typeorm';
import { BigIntTransformer } from './BigIntTransformer';

export function BigIntColumn(options: ColumnOptions = {}): PropertyDecorator {
  return function (target: object, propertyKey: string | symbol): void {
    Column({
      type: 'bigint',
      unsigned: true,
      transformer: new BigIntTransformer(),
      ...options,
    })(target, propertyKey);
  };
}

export function BigIntPrimaryColumn(options: { name?: string } = {}): PropertyDecorator {
  return function (target: object, propertyKey: string | symbol): void {
    Column({
      type: 'bigint',
      unsigned: true,
      primary: true,
      generated: 'increment',
      transformer: new BigIntTransformer(),
      ...options,
    })(target, propertyKey);
  };
}
