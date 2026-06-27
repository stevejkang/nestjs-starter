import { of, lastValueFrom } from 'rxjs';
import { CallHandler, ExecutionContext, HttpStatus } from '@nestjs/common';
import { CoreResponseInterceptor } from '../CoreResponseInterceptor';
import { TRACE_ID_HEADER_KEY } from '../../middlewares/TraceIdIssuanceMiddleware';

function createMockExecutionContext(options: {
  method?: string;
  url?: string;
  statusCode?: number;
  traceId?: string;
}): ExecutionContext {
  const { method = 'GET', url = '/api/test', statusCode = 200, traceId = '' } = options;
  const request = {
    method,
    originalUrl: url,
    headers: {
      [TRACE_ID_HEADER_KEY]: traceId,
    },
  };
  const response = { statusCode };
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

describe('CoreResponseInterceptor', () => {
  let interceptor: CoreResponseInterceptor;

  beforeEach(() => {
    interceptor = new CoreResponseInterceptor();
  });

  it('should return an Observable', () => {
    const context = createMockExecutionContext({});
    const handler = createMockCallHandler();

    const result = interceptor.intercept(context, handler);

    expect(result).toBeDefined();
    expect(typeof result.subscribe).toBe('function');
  });

  it('should wrap response with envelope fields', async () => {
    const context = createMockExecutionContext({
      method: 'GET',
      url: '/api/users',
      statusCode: 200,
      traceId: 'trace-123',
    });
    const handler = createMockCallHandler({ id: 1, name: 'Alice' });

    const result = await lastValueFrom(interceptor.intercept(context, handler));

    expect(result).toMatchObject({
      traceId: 'trace-123',
      statusCode: 200,
      path: '/api/users',
      ok: true,
      result: { id: 1, name: 'Alice' },
    });
  });

  it('should include a timestamp in ISO 8601 format', async () => {
    const context = createMockExecutionContext({ statusCode: 200 });
    const handler = createMockCallHandler({});

    const result = (await lastValueFrom(interceptor.intercept(context, handler))) as Record<string, unknown>;

    expect(typeof result['timestamp']).toBe('string');
    expect(new Date(result['timestamp'] as string).toISOString()).toBe(result['timestamp']);
  });

  it('should preserve original data inside result', async () => {
    const data = { items: [1, 2, 3], total: 3 };
    const context = createMockExecutionContext({ statusCode: 200 });
    const handler = createMockCallHandler(data);

    const result = (await lastValueFrom(interceptor.intercept(context, handler))) as Record<string, unknown>;

    expect(result['result']).toEqual(data);
  });

  it('should skip wrapping for 204 No Content and return data as-is', async () => {
    const context = createMockExecutionContext({ statusCode: HttpStatus.NO_CONTENT });
    const handler = createMockCallHandler(null);

    const result = await lastValueFrom(interceptor.intercept(context, handler));

    expect(result).toBeNull();
  });

  it('should return null as-is for 204 No Content when handler returns null', async () => {
    const context = createMockExecutionContext({ statusCode: HttpStatus.NO_CONTENT });
    const handler = createMockCallHandler(null);

    const result = await lastValueFrom(interceptor.intercept(context, handler));

    expect(result).toBeNull();
  });

  it('should default result to {} when data is null', async () => {
    const context = createMockExecutionContext({ statusCode: 200 });
    const handler = createMockCallHandler(null);

    const result = (await lastValueFrom(interceptor.intercept(context, handler))) as Record<string, unknown>;

    expect(result['result']).toEqual({});
    expect(result['ok']).toBe(true);
  });

  it('should default result to {} when data is undefined', async () => {
    const context = createMockExecutionContext({ statusCode: 200 });
    const handler: CallHandler = {
      handle: jest.fn().mockReturnValue(of(undefined as unknown as null)),
    };

    const result = (await lastValueFrom(interceptor.intercept(context, handler))) as Record<string, unknown>;

    expect(result['result']).toEqual({});
    expect(result['ok']).toBe(true);
  });

  it('should use traceId from request headers', async () => {
    const context = createMockExecutionContext({ traceId: 'my-trace-id-456', statusCode: 200 });
    const handler = createMockCallHandler({});

    const result = (await lastValueFrom(interceptor.intercept(context, handler))) as Record<string, unknown>;

    expect(result['traceId']).toBe('my-trace-id-456');
  });

  it('should use empty string for traceId when header is absent', async () => {
    const request = {
      method: 'GET',
      originalUrl: '/api/test',
      headers: {},
    };
    const response = { statusCode: 200 };
    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    } as unknown as ExecutionContext;
    const handler = createMockCallHandler({});

    const result = (await lastValueFrom(interceptor.intercept(context, handler))) as Record<string, unknown>;

    expect(result['traceId']).toBe('');
  });

  it('should include the correct path from request.originalUrl', async () => {
    const context = createMockExecutionContext({ url: '/api/v1/products/42', statusCode: 200 });
    const handler = createMockCallHandler({});

    const result = (await lastValueFrom(interceptor.intercept(context, handler))) as Record<string, unknown>;

    expect(result['path']).toBe('/api/v1/products/42');
  });

  it('should include the correct statusCode from response', async () => {
    const context = createMockExecutionContext({ statusCode: 201 });
    const handler = createMockCallHandler({ id: 'abc' });

    const result = (await lastValueFrom(interceptor.intercept(context, handler))) as Record<string, unknown>;

    expect(result['statusCode']).toBe(201);
  });

  it('should call next.handle()', async () => {
    const context = createMockExecutionContext({});
    const handler = createMockCallHandler();

    await lastValueFrom(interceptor.intercept(context, handler));

    expect(handler.handle).toHaveBeenCalledTimes(1);
  });
});
