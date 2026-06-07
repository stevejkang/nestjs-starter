import { validate } from 'class-validator';

import { IsValidUrl } from '../IsValidUrl';

class UrlDto {
  @IsValidUrl()
  url!: string;
}

class AbsolutePathDto {
  @IsValidUrl({ allowAbsolutePath: true })
  url!: string;
}

class HttpAllowedDto {
  @IsValidUrl({ httpsOnly: false })
  url!: string;
}

class ConditionalDto {
  validateUrl!: boolean;

  @IsValidUrl({ when: (obj: unknown) => obj instanceof ConditionalDto && obj.validateUrl })
  url!: string;
}

describe('IsValidUrl', () => {
  it('should validate https URLs by default', async () => {
    const dto = new UrlDto();
    dto.url = 'https://example.com/path?query=true';

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should reject http URLs by default', async () => {
    const dto = new UrlDto();
    dto.url = 'http://example.com';

    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
  });

  it('should allow http URLs when httpsOnly is false', async () => {
    const dto = new HttpAllowedDto();
    dto.url = 'http://example.com';

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should allow absolute paths when allowAbsolutePath is true', async () => {
    const dto = new AbsolutePathDto();
    dto.url = '/callback/path';

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should reject absolute paths by default', async () => {
    const dto = new UrlDto();
    dto.url = '/callback/path';

    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
  });

  it('should skip validation when conditional function returns false', async () => {
    const dto = new ConditionalDto();
    dto.validateUrl = false;
    dto.url = 'not a url';

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should validate when conditional function returns true', async () => {
    const dto = new ConditionalDto();
    dto.validateUrl = true;
    dto.url = 'not a url';

    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
  });

  it('should reject non-string values', async () => {
    const dto = new UrlDto();
    (dto as unknown as Record<string, unknown>).url = 12345;

    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
  });

  it('should reject null values', async () => {
    const dto = new UrlDto();
    (dto as unknown as Record<string, unknown>).url = null;

    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
  });

  it('should reject undefined values', async () => {
    const dto = new UrlDto();
    (dto as unknown as Record<string, unknown>).url = undefined;

    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
  });

  it('should reject non-string values when conditional function returns true', async () => {
    const dto = new ConditionalDto();
    dto.validateUrl = true;
    (dto as unknown as Record<string, unknown>).url = 42;

    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
  });
});
