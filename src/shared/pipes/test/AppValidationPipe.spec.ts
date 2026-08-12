import { BadRequestException } from '@nestjs/common';
import { IsString, IsInt } from 'class-validator';
import { AppValidationPipe } from '../AppValidationPipe';

class TestBodyDto {
  @IsString()
  name!: string;

  @IsInt()
  age!: number;
}

class TestQueryDto {
  @IsString()
  search!: string;
}

describe('AppValidationPipe', () => {
  let pipe: AppValidationPipe;

  beforeEach(() => {
    pipe = new AppValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    });
  });

  describe('param passthrough', () => {
    it('should return raw string untouched when metatype is Number', async () => {
      const result = await pipe.transform('abc123', {
        type: 'param',
        metatype: Number,
        data: 'id',
      });

      expect(result).toBe('abc123');
    });

    it('should return raw value untouched when metatype is undefined', async () => {
      const result = await pipe.transform('raw-value', {
        type: 'param',
        metatype: undefined,
        data: 'id',
      });

      expect(result).toBe('raw-value');
    });
  });

  describe('query passthrough', () => {
    it('should return raw string untouched when metatype is String', async () => {
      const result = await pipe.transform('search-term', {
        type: 'query',
        metatype: String,
        data: 'q',
      });

      expect(result).toBe('search-term');
    });
  });

  describe('delegation to super.transform', () => {
    it('should validate body DTO and throw BadRequestException for invalid payload', async () => {
      await expect(
        pipe.transform(
          { name: 123, age: 'not-a-number' },
          { type: 'body', metatype: TestBodyDto, data: '' },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should validate and transform query DTO with class metatype', async () => {
      const result = await pipe.transform(
        { search: 'hello' },
        { type: 'query', metatype: TestQueryDto, data: '' },
      );

      expect(result).toBeInstanceOf(TestQueryDto);
      expect((result as TestQueryDto).search).toBe('hello');
    });

    it('should reject invalid body DTO proving super.transform delegation is intact', async () => {
      await expect(
        pipe.transform(
          { name: 'valid', age: 'invalid', extraField: 'forbidden' },
          { type: 'body', metatype: TestBodyDto, data: '' },
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
