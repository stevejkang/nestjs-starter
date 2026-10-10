import { registerDecorator, ValidationOptions } from 'class-validator';
import { Column, ColumnOptions } from 'typeorm';
import { DateColumnTransformer } from './DateColumnTransformer';

interface DateColumnOptions extends ColumnOptions {
  validationOptions?: ValidationOptions;
}

export function DateColumn(options: DateColumnOptions = {}): PropertyDecorator {
  return function (target: object, propertyKey: string | symbol): void {
    registerDecorator({
      name: 'dateColumn',
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
      type: 'date',
      nullable: options.nullable || false,
      transformer:
        options.nullable === true ? new DateColumnTransformer<Date | null>() : new DateColumnTransformer<Date>(),
      ...options,
    })(target, propertyKey);
  };
}
