import { BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';

import { TransformToBoolean } from '../TransformToBoolean';

class BooleanDto {
  @TransformToBoolean()
  value!: boolean;
}

describe('TransformToBoolean', () => {
  it('should transform truthy string values to true', () => {
    for (const value of ['true', 'TRUE', ' 1 ', 'yes', 'ON']) {
      const dto = plainToInstance(BooleanDto, { value });

      expect(dto.value).toEqual(true);
    }
  });

  it('should transform falsy string values to false', () => {
    for (const value of ['false', 'FALSE', ' 0 ', 'no', 'OFF']) {
      const dto = plainToInstance(BooleanDto, { value });

      expect(dto.value).toEqual(false);
    }
  });

  it('should transform boolean and number values', () => {
    expect(plainToInstance(BooleanDto, { value: true }).value).toEqual(true);
    expect(plainToInstance(BooleanDto, { value: false }).value).toEqual(false);
    expect(plainToInstance(BooleanDto, { value: 1 }).value).toEqual(true);
    expect(plainToInstance(BooleanDto, { value: 0 }).value).toEqual(false);
  });

  it('should throw BadRequestException for invalid values', () => {
    expect(() => plainToInstance(BooleanDto, { value: 'maybe' })).toThrow(
      BadRequestException,
    );
    expect(() => plainToInstance(BooleanDto, { value: 2 })).toThrow(
      BadRequestException,
    );
  });
});
