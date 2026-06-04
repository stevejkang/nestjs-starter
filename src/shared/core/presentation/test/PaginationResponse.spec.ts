import { PaginationResponse } from '../PaginationResponse';

describe('PaginationResponse', () => {
  it('constructs an offset pagination response with items and metadata', () => {
    const response = new PaginationResponse(['alpha', 'beta'], 42, 2, 10);

    expect(response).toBeDefined();
    expect(response).toBeInstanceOf(PaginationResponse);
    expect(response.items).toStrictEqual(['alpha', 'beta']);
    expect(response.totalCount).toBe(42);
    expect(response.page).toBe(2);
    expect(response.limit).toBe(10);
  });

  it('computes totalPages by rounding up partial pages', () => {
    const response = new PaginationResponse(['alpha'], 21, 1, 20);

    expect(response.totalPages).toBe(2);
  });

  it('computes totalPages as zero when there are no items', () => {
    const response = new PaginationResponse<string>([], 0, 1, 20);

    expect(response.totalPages).toBe(0);
  });
});
