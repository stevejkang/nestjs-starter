import { plainToInstance } from 'class-transformer';

import { TransformToNumberArray } from '../TransformToNumberArray';

class NumberArrayDto {
  @TransformToNumberArray()
  value!: number[];
}

describe('TransformToNumberArray', () => {
  it('should transform comma-separated strings to number arrays', () => {
    const dto = plainToInstance(NumberArrayDto, { value: '1,2,3' });

    expect(dto.value).toEqual([1, 2, 3]);
  });

  it('should trim comma-separated string values', () => {
    const dto = plainToInstance(NumberArrayDto, { value: '1, 2, 3' });

    expect(dto.value).toEqual([1, 2, 3]);
  });

  it('should transform array values to number arrays', () => {
    const dto = plainToInstance(NumberArrayDto, { value: ['1', 2, '3'] });

    expect(dto.value).toEqual([1, 2, 3]);
  });

  it('should filter out NaN values', () => {
    const dtoFromString = plainToInstance(NumberArrayDto, {
      value: '1,two,3',
    });
    const dtoFromArray = plainToInstance(NumberArrayDto, {
      value: ['1', 'two', 3],
    });

    expect(dtoFromString.value).toEqual([1, 3]);
    expect(dtoFromArray.value).toEqual([1, 3]);
  });

  it('should wrap a single numeric value in an array', () => {
    const dto = plainToInstance(NumberArrayDto, { value: 42 });

    expect(dto.value).toEqual([42]);
  });

  it('should return empty array for a single non-numeric non-string value', () => {
    const dto = plainToInstance(NumberArrayDto, { value: {} });

    expect(dto.value).toEqual([]);
  });

  it('should handle boolean values by converting to number', () => {
    const dto = plainToInstance(NumberArrayDto, { value: true });

    expect(dto.value).toEqual([1]);
  });
});
