import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { PaginationQuery } from '../PaginationQuery';

describe('PaginationQuery', () => {
  it('uses default page and limit when query params are missing', async () => {
    const query = plainToInstance(PaginationQuery, {});

    const errors = await validate(query);

    expect(errors).toHaveLength(0);
    expect(query.page).toBe(1);
    expect(query.limit).toBe(20);
  });

  it('transforms numeric string query params to numbers', async () => {
    const query = plainToInstance(PaginationQuery, {
      page: '2',
      limit: '10',
    });

    const errors = await validate(query);

    expect(errors).toHaveLength(0);
    expect(query.page).toBe(2);
    expect(query.limit).toBe(10);
  });

  it('accepts page and limit boundary values', async () => {
    const query = plainToInstance(PaginationQuery, {
      page: '1',
      limit: '1',
    });

    const errors = await validate(query);

    expect(errors).toHaveLength(0);
    expect(query.page).toBe(1);
    expect(query.limit).toBe(1);
  });

  it('rejects page values below the minimum', async () => {
    const query = plainToInstance(PaginationQuery, {
      page: '0',
      limit: '20',
    });

    const errors = await validate(query);

    expect(errors).toHaveLength(1);
    expect(errors[0]?.property).toBe('page');
    expect(errors[0]?.constraints).toHaveProperty('min');
  });

  it('rejects limit values below the minimum', async () => {
    const query = plainToInstance(PaginationQuery, {
      page: '1',
      limit: '0',
    });

    const errors = await validate(query);

    expect(errors).toHaveLength(1);
    expect(errors[0]?.property).toBe('limit');
    expect(errors[0]?.constraints).toHaveProperty('min');
  });

  it('rejects limit values above the default maximum', async () => {
    const query = plainToInstance(PaginationQuery, {
      page: '1',
      limit: '101',
    });

    const errors = await validate(query);

    expect(errors).toHaveLength(1);
    expect(errors[0]?.property).toBe('limit');
    expect(errors[0]?.constraints).toHaveProperty('max');
  });

  it('rejects non-integer numeric string values', async () => {
    const query = plainToInstance(PaginationQuery, {
      page: '1.5',
      limit: '20.5',
    });

    const errors = await validate(query);

    expect(errors).toHaveLength(2);
    expect(errors.map((error) => error.property)).toEqual(['page', 'limit']);
  });

  it('rejects non-numeric string values', async () => {
    const query = plainToInstance(PaginationQuery, {
      page: 'one',
      limit: 'twenty',
    });

    const errors = await validate(query);

    expect(errors).toHaveLength(2);
    expect(errors.map((error) => error.property)).toEqual(['page', 'limit']);
  });
});
