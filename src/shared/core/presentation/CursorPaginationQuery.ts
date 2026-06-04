import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

const DEFAULT_CURSOR_PAGINATION_LIMIT = 20;

const transformQueryNumber = ({ value }: { value: unknown }): number | undefined => {
  if (value === undefined) {
    return undefined;
  }

  return Number(value);
};

export class CursorPaginationQuery {
  @ApiPropertyOptional({
    name: 'cursor',
    description: 'Cursor for the next page',
    type: String,
    example: 'eyJpZCI6IjEyMyJ9',
  })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({
    name: 'limit',
    description: 'Number of items per page',
    default: DEFAULT_CURSOR_PAGINATION_LIMIT,
    minimum: 1,
    example: DEFAULT_CURSOR_PAGINATION_LIMIT,
  })
  @IsOptional()
  @Transform(transformQueryNumber)
  @IsInt()
  @Min(1)
  limit: number = DEFAULT_CURSOR_PAGINATION_LIMIT;
}
