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
});
