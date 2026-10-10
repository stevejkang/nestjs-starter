import { registerDecorator, ValidationOptions } from 'class-validator';
import { Column, ColumnOptions } from 'typeorm';
import { DateTimeColumnTransformer } from './DateTimeColumnTransformer';

interface DateTimeColumnOptions extends ColumnOptions {
  validationOptions?: ValidationOptions;
}

export function DateTimeColumn(options: DateTimeColumnOptions = {}): PropertyDecorator {
  return function (target: object, propertyKey: string | symbol): void {
    registerDecorator({
      name: 'dateTimeColumn',
      target: target.constructor,
      propertyName: propertyKey.toString(),
      options: options.validationOptions,
      validator: {
        validate(value: unknown): boolean {
          if (value === null) {
            return options.nullable || false;
          }

          if (value instanceof Date) {
            return true;
          }

          if (typeof value === 'string') {
            return !isNaN(Date.parse(value));
          }

          return false;
        },
      },
    });

    Column({
      type: 'datetime',
      nullable: options.nullable || false,
      transformer:
        options.nullable === true
          ? new DateTimeColumnTransformer<Date | null>()
          : new DateTimeColumnTransformer<Date>(),
      ...options,
    })(target, propertyKey);
  };
}
