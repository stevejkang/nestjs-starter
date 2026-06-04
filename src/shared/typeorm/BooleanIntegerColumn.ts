import { registerDecorator, ValidationOptions } from 'class-validator';
import { Column, ColumnOptions } from 'typeorm';
import { BooleanIntegerTransformer } from './BooleanIntegerTransformer';

interface BooleanIntegerColumnOptions extends ColumnOptions {
  validationOptions?: ValidationOptions;
}

export function BooleanIntegerColumn(options: BooleanIntegerColumnOptions = {}): PropertyDecorator {
  return function (target: object, propertyKey: string | symbol): void {
    registerDecorator({
      name: 'booleanIntegerColumn',
      target: target.constructor,
      propertyName: propertyKey.toString(),
      options: options.validationOptions,
      validator: {
        validate(value: unknown): boolean {
          if (value === null) {
            return options.nullable || false;
          }

          return typeof value === 'boolean';
        },
      },
    });

    Column({
      type: 'tinyint',
      nullable: options.nullable || false,
      transformer: new BooleanIntegerTransformer(),
      ...options,
    })(target, propertyKey);
  };
}
