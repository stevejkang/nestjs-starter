import { ArgumentMetadata, ValidationPipe } from '@nestjs/common';

/**
 * Extends the default ValidationPipe to prevent implicit primitive type
 * coercion on route parameters. NestJS's built-in `transform: true`
 * converts @Param values based on the TypeScript metatype (e.g. string
 * → number) before custom pipes (such as ParseExternalIdPipe) run.
 * This breaks pipes that expect raw string input from the URL.
 *
 * This subclass skips the primitive transformation for `param` and
 * `query` metadata types, letting custom pipes handle conversion.
 */
export class AppValidationPipe extends ValidationPipe {
  private static readonly PRIMITIVE_TYPES: ReadonlySet<unknown> = new Set([String, Boolean, Number, Array, Object]);

  async transform(value: unknown, metadata: ArgumentMetadata): Promise<unknown> {
    if (metadata.type === 'param' || metadata.type === 'query') {
      const metatype = metadata.metatype;

      if (!metatype || AppValidationPipe.PRIMITIVE_TYPES.has(metatype)) {
        return value;
      }
    }

    return super.transform(value, metadata);
  }
}
