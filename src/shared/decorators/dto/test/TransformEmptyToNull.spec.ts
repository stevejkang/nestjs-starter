import { plainToInstance } from 'class-transformer';

import { TransformEmptyToNull } from '../TransformEmptyToNull';

class EmptyToNullDto {
  @TransformEmptyToNull()
  value!: string | null | undefined;
}

describe('TransformEmptyToNull', () => {
  it('should transform empty string to null', () => {
    const dto = plainToInstance(EmptyToNullDto, { value: '' });

    expect(dto.value).toBeNull();
  });

  it('should not transform whitespace strings', () => {
    const dto = plainToInstance(EmptyToNullDto, { value: ' ' });

    expect(dto.value).toEqual(' ');
  });

  it('should not transform null or undefined values', () => {
    const nullDto = plainToInstance(EmptyToNullDto, { value: null });
    const undefinedDto = plainToInstance(EmptyToNullDto, {
      value: undefined,
    });

    expect(nullDto.value).toBeNull();
    expect(undefinedDto.value).toBeUndefined();
  });
});
