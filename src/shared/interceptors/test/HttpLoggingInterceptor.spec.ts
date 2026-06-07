import { of, lastValueFrom } from 'rxjs';
import { CallHandler, ExecutionContext, Logger } from '@nestjs/common';
import { HttpLoggingInterceptor } from '../HttpLoggingInterceptor';

function createMockExecutionContext(
  method: string,
  url: string,
  statusCode: number,
): { context: ExecutionContext; response: { statusCode: number } } {
  const request = { method, originalUrl: url };
  const response = { statusCode };
  const context = {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as unknown as ExecutionContext;
  return { context, response };
}

function createMockCallHandler(returnValue: unknown = { success: true }): CallHandler {
  return {
    handle: jest.fn().mockReturnValue(of(returnValue)),
  };
}

describe('HttpLoggingInterceptor', () => {
  let interceptor: HttpLoggingInterceptor;
  let loggerLogSpy: jest.SpyInstance;

  beforeEach(() => {
    interceptor = new HttpLoggingInterceptor();
    loggerLogSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
  });

  afterEach(() => {
    loggerLogSpy.mockRestore();
  });

  it('should return an Observable', () => {
    const { context } = createMockExecutionContext('GET', '/api/test', 200);
    const handler = createMockCallHandler();

    const result = interceptor.intercept(context, handler);

    expect(result).toBeDefined();
    expect(typeof result.subscribe).toBe('function');
  });

  it('should pass through the handler response value', async () => {
    const { context } = createMockExecutionContext('GET', '/api/users', 200);
    const handler = createMockCallHandler({ users: [] });

    const result = await lastValueFrom(interceptor.intercept(context, handler));

    expect(result).toEqual({ users: [] });
  });

  it('should call logger.log with status code, method, URL, and delay', async () => {
    const { context } = createMockExecutionContext('POST', '/api/items', 201);
    const handler = createMockCallHandler({ id: 1 });

    await lastValueFrom(interceptor.intercept(context, handler));

    expect(loggerLogSpy).toHaveBeenCalledTimes(1);
    const logMessage = loggerLogSpy.mock.calls[0][0] as string;
    expect(logMessage).toMatch(/^201 \| POST \/api\/items \+\d+ms$/);
  });

  it('should log the correct status code from response', async () => {
    const { context } = createMockExecutionContext('DELETE', '/api/items/1', 204);
    const handler = createMockCallHandler(null);

    await lastValueFrom(interceptor.intercept(context, handler));

    const logMessage = loggerLogSpy.mock.calls[0][0] as string;
    expect(logMessage).toContain('204');
    expect(logMessage).toContain('DELETE');
    expect(logMessage).toContain('/api/items/1');
  });

  it('should call next.handle()', async () => {
    const { context } = createMockExecutionContext('GET', '/health', 200);
    const handler = createMockCallHandler();

    await lastValueFrom(interceptor.intercept(context, handler));

    expect(handler.handle).toHaveBeenCalledTimes(1);
  });
});
