import { ApiProperty } from '@nestjs/swagger';

export class PaginationResponse<T> {
  @ApiProperty({
    name: 'items',
    description: 'Paginated items',
    required: true,
    isArray: true,
  })
  items: T[];

  @ApiProperty({
    name: 'totalCount',
    description: 'Total number of items',
    required: true,
    example: 42,
  })
  totalCount: number;

  @ApiProperty({
    name: 'page',
    description: 'Current page number',
    required: true,
    example: 1,
  })
  page: number;

  @ApiProperty({
    name: 'limit',
    description: 'Number of items per page',
    required: true,
    example: 20,
  })
  limit: number;

  @ApiProperty({
    name: 'totalPages',
    description: 'Total number of pages',
    required: true,
    example: 3,
  })
  get totalPages(): number {
    return Math.ceil(this.totalCount / this.limit);
  }

  constructor(items: T[], totalCount: number, page: number, limit: number) {
    this.items = items;
    this.totalCount = totalCount;
    this.page = page;
    this.limit = limit;
  }
}
