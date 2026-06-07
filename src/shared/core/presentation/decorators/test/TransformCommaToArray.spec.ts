import { plainToInstance } from 'class-transformer';

import { TransformCommaToArray } from '../TransformCommaToArray';

class CommaArrayDto {
  @TransformCommaToArray()
  value!: string[];
}

describe('TransformCommaToArray', () => {
  it('should transform comma-separated string to string array', () => {
    const dto = plainToInstance(CommaArrayDto, { value: 'a,b,c' });

    expect(dto.value).toEqual(['a', 'b', 'c']);
  });

  it('should trim whitespace around comma-separated values', () => {
    const dto = plainToInstance(CommaArrayDto, { value: 'a , b , c' });

    expect(dto.value).toEqual(['a', 'b', 'c']);
  });

  it('should pass through array values as string array', () => {
    const dto = plainToInstance(CommaArrayDto, { value: ['x', 'y', 'z'] });

    expect(dto.value).toEqual(['x', 'y', 'z']);
  });

  it('should convert non-string array elements to strings', () => {
    const dto = plainToInstance(CommaArrayDto, { value: [1, 2, 3] });

    expect(dto.value).toEqual(['1', '2', '3']);
  });

  it('should handle single value string', () => {
    const dto = plainToInstance(CommaArrayDto, { value: 'only' });

    expect(dto.value).toEqual(['only']);
  });

  it('should convert non-string non-array value to single-element array', () => {
    const dto = plainToInstance(CommaArrayDto, { value: 42 });

    expect(dto.value).toEqual(['42']);
  });
});
