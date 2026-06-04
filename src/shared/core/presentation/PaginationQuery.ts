import { Transform } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export const DEFAULT_PAGINATION_PAGE = 1;
export const DEFAULT_PAGINATION_LIMIT = 20;
export const DEFAULT_MAX_PAGINATION_LIMIT = 100;

const transformQueryNumber = ({ value }: { value: unknown }): number | undefined => {
  if (value === undefined) {
    return undefined;
  }

  return Number(value);
};

export class PaginationQuery {
  @ApiPropertyOptional({
    name: 'page',
    description: 'Page number',
    default: DEFAULT_PAGINATION_PAGE,
    minimum: 1,
    example: 1,
  })
  @IsOptional()
  @Transform(transformQueryNumber)
  @IsInt()
  @Min(1)
  page: number = DEFAULT_PAGINATION_PAGE;

  @ApiPropertyOptional({
    name: 'limit',
    description: 'Number of items per page',
    default: DEFAULT_PAGINATION_LIMIT,
    minimum: 1,
    maximum: DEFAULT_MAX_PAGINATION_LIMIT,
    example: DEFAULT_PAGINATION_LIMIT,
  })
  @IsOptional()
  @Transform(transformQueryNumber)
  @IsInt()
  @Min(1)
  @Max(DEFAULT_MAX_PAGINATION_LIMIT)
  limit: number = DEFAULT_PAGINATION_LIMIT;
}
