import { CursorPaginationResponse } from '../CursorPaginationResponse';

describe('CursorPaginationResponse', () => {
  it('creates a cursor pagination response through the static factory', () => {
    const response = CursorPaginationResponse.of(['alpha', 'beta'], 42, 'next-cursor', true);

    expect(response).toBeDefined();
    expect(response).toBeInstanceOf(CursorPaginationResponse);
    expect(response.items).toStrictEqual(['alpha', 'beta']);
    expect(response.totalCount).toBe(42);
    expect(response.next).toBe('next-cursor');
    expect(response.hasNext).toBe(true);
  });

  it('allows a null next cursor when there is no next page', () => {
    const response = CursorPaginationResponse.of<string>([], 0, null, false);

    expect(response.items).toStrictEqual([]);
    expect(response.totalCount).toBe(0);
    expect(response.next).toBeNull();
    expect(response.hasNext).toBe(false);
  });
});
