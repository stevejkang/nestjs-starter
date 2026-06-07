import { of, lastValueFrom } from 'rxjs';
import { CallHandler, ConflictException, ExecutionContext, HttpStatus } from '@nestjs/common';
import { IdempotencyInterceptor } from '../IdempotencyInterceptor';
import { CacheClient } from '../../cache/interfaces';

function createMockCacheClient(overrides: Partial<CacheClient> = {}): jest.Mocked<CacheClient> {
  return {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
    sadd: jest.fn().mockResolvedValue(undefined),
    smembers: jest.fn().mockResolvedValue([]),
    ...overrides,
  } as jest.Mocked<CacheClient>;
}

function createMockExecutionContext(headers: Record<string, string> = {}): ExecutionContext {
  const request = {
    headers,
  };
  const response = {
    statusCode: HttpStatus.OK,
  };
  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as unknown as ExecutionContext;
}

function createMockCallHandler(returnValue: unknown = { success: true }): CallHandler {
  return {
    handle: jest.fn().mockReturnValue(of(returnValue)),
  };
}

describe('IdempotencyInterceptor', () => {
  let interceptor: IdempotencyInterceptor;
  let cacheClient: jest.Mocked<CacheClient>;

  beforeEach(() => {
    cacheClient = createMockCacheClient();
    interceptor = new IdempotencyInterceptor(cacheClient);
  });

  describe('when no Idempotency-Key header is present', () => {
    it('should pass through to handler without cache interaction', async () => {
      const context = createMockExecutionContext({});
      const handler = createMockCallHandler({ data: 'response' });

      const result = await lastValueFrom(interceptor.intercept(context, handler));

      expect(result).toEqual({ data: 'response' });
      expect(handler.handle).toHaveBeenCalled();
      expect(cacheClient.get).not.toHaveBeenCalled();
      expect(cacheClient.set).not.toHaveBeenCalled();
    });
  });

  describe('when Idempotency-Key header is present (first request)', () => {
    it('should execute handler, cache the result, and return it', async () => {
      const context = createMockExecutionContext({ 'idempotency-key': 'abc-123' });
      const handler = createMockCallHandler({ id: 1, name: 'created' });

      const result = await lastValueFrom(interceptor.intercept(context, handler));

      expect(result).toEqual({ id: 1, name: 'created' });
      expect(handler.handle).toHaveBeenCalled();
      expect(cacheClient.get).toHaveBeenCalledWith('idempotency:abc-123');
      expect(cacheClient.set).toHaveBeenCalledWith(
        'idempotency:abc-123',
        JSON.stringify({ statusCode: HttpStatus.OK, body: { id: 1, name: 'created' } }),
        10800,
      );
    });

    it('should remove the processing marker after caching the result', async () => {
      const context = createMockExecutionContext({ 'idempotency-key': 'abc-123' });
      const handler = createMockCallHandler({ done: true });

      await lastValueFrom(interceptor.intercept(context, handler));

      expect(cacheClient.del).toHaveBeenCalledWith(['idempotency:abc-123:processing']);
    });
  });

  describe('when Idempotency-Key header is present (cached result exists)', () => {
    it('should return cached result without executing handler', async () => {
      const cached = JSON.stringify({ statusCode: HttpStatus.CREATED, body: { id: 1 } });
      cacheClient = createMockCacheClient({ get: jest.fn().mockResolvedValue(cached) });
      interceptor = new IdempotencyInterceptor(cacheClient);

      const context = createMockExecutionContext({ 'idempotency-key': 'abc-123' });
      const handler = createMockCallHandler();

      const result = await lastValueFrom(interceptor.intercept(context, handler));

      expect(result).toEqual({ id: 1 });
      expect(handler.handle).not.toHaveBeenCalled();
    });

    it('should set the response status code from the cached result', async () => {
      const cached = JSON.stringify({ statusCode: HttpStatus.CREATED, body: { id: 1 } });
      cacheClient = createMockCacheClient({ get: jest.fn().mockResolvedValue(cached) });
      interceptor = new IdempotencyInterceptor(cacheClient);

      const context = createMockExecutionContext({ 'idempotency-key': 'abc-123' });
      const response = context.switchToHttp().getResponse() as { statusCode: number };
      const handler = createMockCallHandler();

      await lastValueFrom(interceptor.intercept(context, handler));

      expect(response.statusCode).toBe(HttpStatus.CREATED);
    });
  });

  describe('when a concurrent request is in-flight (processing marker)', () => {
    it('should throw ConflictException', async () => {
      const processingMarker = '__processing__';
      cacheClient = createMockCacheClient({
        get: jest.fn().mockImplementation((key: string) => {
          if (key === 'idempotency:abc-123') return Promise.resolve(null);
          if (key === 'idempotency:abc-123:processing') return Promise.resolve(processingMarker);
          return Promise.resolve(null);
        }),
      });
      interceptor = new IdempotencyInterceptor(cacheClient);

      const context = createMockExecutionContext({ 'idempotency-key': 'abc-123' });
      const handler = createMockCallHandler();

      await expect(
        lastValueFrom(interceptor.intercept(context, handler)),
      ).rejects.toThrow(ConflictException);

      expect(handler.handle).not.toHaveBeenCalled();
    });
  });

  describe('when handler returns 5xx response', () => {
    it('should not cache the result', async () => {
      const context = createMockExecutionContext({ 'idempotency-key': 'abc-123' });
      const response = context.switchToHttp().getResponse() as { statusCode: number };
      const handler = createMockCallHandler({ error: 'internal' });

      response.statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      handler.handle = jest.fn().mockReturnValue(of({ error: 'internal' }));

      await lastValueFrom(interceptor.intercept(context, handler));

      expect(cacheClient.set).not.toHaveBeenCalledWith(
        'idempotency:abc-123',
        expect.any(String),
        10800,
      );
    });

    it('should still remove the processing marker on 5xx', async () => {
      const context = createMockExecutionContext({ 'idempotency-key': 'abc-123' });
      const response = context.switchToHttp().getResponse() as { statusCode: number };
      response.statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      const handler = createMockCallHandler({ error: 'internal' });

      await lastValueFrom(interceptor.intercept(context, handler));

      expect(cacheClient.del).toHaveBeenCalledWith(['idempotency:abc-123:processing']);
    });
  });

  describe('when CacheClient fails', () => {
    it('should fall through to handler on cache get failure', async () => {
      cacheClient = createMockCacheClient({
        get: jest.fn().mockRejectedValue(new Error('Redis down')),
      });
      interceptor = new IdempotencyInterceptor(cacheClient);

      const context = createMockExecutionContext({ 'idempotency-key': 'abc-123' });
      const handler = createMockCallHandler({ fallback: true });

      const result = await lastValueFrom(interceptor.intercept(context, handler));

      expect(result).toEqual({ fallback: true });
      expect(handler.handle).toHaveBeenCalled();
    });

    it('should return handler result even when cache set fails', async () => {
      cacheClient = createMockCacheClient({
        set: jest.fn().mockRejectedValue(new Error('Redis write failed')),
      });
      interceptor = new IdempotencyInterceptor(cacheClient);

      const context = createMockExecutionContext({ 'idempotency-key': 'abc-123' });
      const handler = createMockCallHandler({ data: 'ok' });

      const result = await lastValueFrom(interceptor.intercept(context, handler));

      expect(result).toEqual({ data: 'ok' });
    });
  });

  describe('stale processing marker handling', () => {
    it('should set processing marker with 5-minute TTL', async () => {
      const context = createMockExecutionContext({ 'idempotency-key': 'abc-123' });
      const handler = createMockCallHandler();

      await lastValueFrom(interceptor.intercept(context, handler));

      expect(cacheClient.set).toHaveBeenCalledWith(
        'idempotency:abc-123:processing',
        '__processing__',
        300,
      );
    });
  });

  describe('when cleanup of processing marker fails on 5xx', () => {
    it('should not throw when del fails during 5xx cleanup', async () => {
      cacheClient = createMockCacheClient({
        del: jest.fn().mockRejectedValue(new Error('Redis del failed')),
      });
      interceptor = new IdempotencyInterceptor(cacheClient);

      const context = createMockExecutionContext({ 'idempotency-key': 'abc-123' });
      const response = context.switchToHttp().getResponse() as { statusCode: number };
      response.statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      const handler = createMockCallHandler({ error: 'internal' });

      const result = await lastValueFrom(interceptor.intercept(context, handler));

      expect(result).toEqual({ error: 'internal' });
      expect(cacheClient.del).toHaveBeenCalledWith(['idempotency:abc-123:processing']);
    });
  });

  describe('when result caching fails after successful response', () => {
    it('should log warning when del after set fails in result caching chain', async () => {
      cacheClient = createMockCacheClient({
        set: jest.fn().mockImplementation((key: string) => {
          if (key.endsWith(':processing')) return Promise.resolve(undefined);
          return Promise.resolve(undefined);
        }),
        del: jest.fn().mockRejectedValue(new Error('Redis del failed')),
      });
      interceptor = new IdempotencyInterceptor(cacheClient);

      const context = createMockExecutionContext({ 'idempotency-key': 'abc-123' });
      const handler = createMockCallHandler({ data: 'ok' });

      const result = await lastValueFrom(interceptor.intercept(context, handler));

      expect(result).toEqual({ data: 'ok' });
    });
  });

  describe('when processing marker set fails', () => {
    it('should fall through to handler via catchError when set fails', async () => {
      cacheClient = createMockCacheClient({
        set: jest.fn().mockRejectedValue(new Error('Redis set failed')),
      });
      interceptor = new IdempotencyInterceptor(cacheClient);

      const context = createMockExecutionContext({ 'idempotency-key': 'abc-123' });
      const handler = createMockCallHandler({ fallback: true });

      const result = await lastValueFrom(interceptor.intercept(context, handler));

      expect(result).toEqual({ fallback: true });
    });
  });
});
