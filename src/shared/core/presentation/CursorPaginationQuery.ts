import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TransformToNumber } from './decorators/TransformToNumber';

const DEFAULT_CURSOR_PAGINATION_LIMIT = 20;

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
  @TransformToNumber()
  @IsInt()
  @Min(1)
  limit: number = DEFAULT_CURSOR_PAGINATION_LIMIT;
}
