import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { CursorPaginationQuery } from '../CursorPaginationQuery';

describe('CursorPaginationQuery', () => {
  it('uses default limit when query params are missing', async () => {
    const query = plainToInstance(CursorPaginationQuery, {});

    const errors = await validate(query);

    expect(errors).toHaveLength(0);
    expect(query.cursor).toBeUndefined();
    expect(query.limit).toBe(20);
  });

  it('accepts an optional cursor string', async () => {
    const query = plainToInstance(CursorPaginationQuery, {
      cursor: 'next-cursor',
      limit: '10',
    });

    const errors = await validate(query);

    expect(errors).toHaveLength(0);
    expect(query.cursor).toBe('next-cursor');
    expect(query.limit).toBe(10);
  });

  it('transforms numeric string limit values to numbers', async () => {
    const query = plainToInstance(CursorPaginationQuery, {
      limit: '1',
    });

    const errors = await validate(query);

    expect(errors).toHaveLength(0);
    expect(query.limit).toBe(1);
  });

  it('rejects non-string cursor values', async () => {
    const query = plainToInstance(CursorPaginationQuery, {
      cursor: 123,
      limit: '20',
    });

    const errors = await validate(query);

    expect(errors).toHaveLength(1);
    expect(errors[0]?.property).toBe('cursor');
    expect(errors[0]?.constraints).toHaveProperty('isString');
  });

  it('rejects limit values below the minimum', async () => {
    const query = plainToInstance(CursorPaginationQuery, {
      limit: '0',
    });

    const errors = await validate(query);

    expect(errors).toHaveLength(1);
    expect(errors[0]?.property).toBe('limit');
    expect(errors[0]?.constraints).toHaveProperty('min');
  });

  it('rejects non-integer numeric string limit values', async () => {
    const query = plainToInstance(CursorPaginationQuery, {
      limit: '2.5',
    });

    const errors = await validate(query);

    expect(errors).toHaveLength(1);
    expect(errors[0]?.property).toBe('limit');
    expect(errors[0]?.constraints).toHaveProperty('isInt');
  });

  it('rejects non-numeric string limit values', async () => {
    const query = plainToInstance(CursorPaginationQuery, {
      limit: 'many',
    });

    const errors = await validate(query);

    expect(errors).toHaveLength(1);
    expect(errors[0]?.property).toBe('limit');
    expect(errors[0]?.constraints).toHaveProperty('isInt');
  });
});
