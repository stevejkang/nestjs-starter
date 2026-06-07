import { BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';

import { TransformToNumber } from '../TransformToNumber';

class NumberDto {
  @TransformToNumber()
  value!: number;
}

describe('TransformToNumber', () => {
  it('should transform string to number', () => {
    const dto = plainToInstance(NumberDto, { value: '42' });

    expect(dto.value).toEqual(42);
  });

  it('should transform float string to number', () => {
    const dto = plainToInstance(NumberDto, { value: '3.14' });

    expect(dto.value).toEqual(3.14);
  });

  it('should pass through number values', () => {
    const dto = plainToInstance(NumberDto, { value: 100 });

    expect(dto.value).toEqual(100);
  });

  it('should transform zero string', () => {
    const dto = plainToInstance(NumberDto, { value: '0' });

    expect(dto.value).toEqual(0);
  });

  it('should pass through undefined', () => {
    const dto = plainToInstance(NumberDto, { value: undefined });

    expect(dto.value).toBeUndefined();
  });

  it('should pass through null', () => {
    const dto = plainToInstance(NumberDto, { value: null });

    expect(dto.value).toBeNull();
  });

  it('should throw BadRequestException for non-numeric string', () => {
    expect(() => plainToInstance(NumberDto, { value: 'abc' })).toThrow(
      BadRequestException,
    );
  });
});
