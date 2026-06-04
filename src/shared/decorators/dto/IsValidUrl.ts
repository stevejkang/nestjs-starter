import {
  registerDecorator,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

export interface IsValidUrlOptions {
  httpsOnly?: boolean;
  allowAbsolutePath?: boolean;
  when?(obj: unknown): boolean;
}

@ValidatorConstraint({ name: 'isValidUrl' })
class IsValidUrlConstraint implements ValidatorConstraintInterface {
  validate(value: unknown, validationArguments: ValidationArguments): boolean {
    const options = validationArguments.constraints[0] as
      | IsValidUrlOptions
      | undefined;

    if (options?.when?.(validationArguments.object) === false) {
      return true;
    }

    if (typeof value !== 'string') {
      return false;
    }

    if (options?.allowAbsolutePath === true && value.startsWith('/')) {
      return true;
    }

    try {
      const url = new URL(value);
      const httpsOnly = options?.httpsOnly ?? true;

      return !httpsOnly || url.protocol === 'https:';
    } catch {
      return false;
    }
  }

  defaultMessage(validationArguments: ValidationArguments): string {
    return `${validationArguments.property} must be a valid URL`;
  }
}

export const IsValidUrl = (
  options: IsValidUrlOptions = {},
): PropertyDecorator =>
  (target: object, propertyKey: string | symbol) => {
    registerDecorator({
      name: 'isValidUrl',
      target: target.constructor,
      propertyName: propertyKey.toString(),
      constraints: [options],
      validator: IsValidUrlConstraint,
    });
  };
