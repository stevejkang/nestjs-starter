import { ApiProperty } from '@nestjs/swagger';

export class CursorPaginationResponse<T> {
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
    name: 'next',
    description: 'Cursor for the next page',
    required: true,
    nullable: true,
    example: 'eyJpZCI6IjEyMyJ9',
  })
  next: string | null;

  @ApiProperty({
    name: 'hasNext',
    description: 'Whether another page is available',
    required: true,
    example: true,
  })
  hasNext: boolean;

  private constructor(items: T[], totalCount: number, next: string | null, hasNext: boolean) {
    this.items = items;
    this.totalCount = totalCount;
    this.next = next;
    this.hasNext = hasNext;
  }

  static of<T>(
    items: T[],
    totalCount: number,
    next: string | null,
    hasNext: boolean,
  ): CursorPaginationResponse<T> {
    return new CursorPaginationResponse(items, totalCount, next, hasNext);
  }
}
