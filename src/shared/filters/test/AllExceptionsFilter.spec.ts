import { ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { AllExceptionsFilter } from '../AllExceptionsFilter';
import { TRACE_ID_HEADER_KEY } from '../../middlewares/TraceIdIssuanceMiddleware';

jest.mock('../../config/config', () => ({
  IS_PRODUCTION: false,
}));

function createMockHttpAdapter(): { getRequestUrl: jest.Mock; reply: jest.Mock } {
  return {
    getRequestUrl: jest.fn().mockReturnValue('/test-path'),
    reply: jest.fn(),
  };
}

function createMockHost(
  request: Record<string, unknown>,
  response: Record<string, unknown>,
): ArgumentsHost {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
    getArgs: jest.fn(),
    getArgByIndex: jest.fn(),
    switchToRpc: jest.fn(),
    switchToWs: jest.fn(),
    getType: jest.fn(),
  } as unknown as ArgumentsHost;
}

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let mockHttpAdapter: ReturnType<typeof createMockHttpAdapter>;
  let httpAdapterHost: HttpAdapterHost;
  let loggerErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    mockHttpAdapter = createMockHttpAdapter();
    httpAdapterHost = { httpAdapter: mockHttpAdapter } as unknown as HttpAdapterHost;
    filter = new AllExceptionsFilter(httpAdapterHost);
    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    loggerErrorSpy.mockRestore();
  });

  describe('when exception is HttpException', () => {
    it('should reply with the exception status code', () => {
      const exception = new HttpException('Not Found', HttpStatus.NOT_FOUND);
      const request = { method: 'GET', headers: { [TRACE_ID_HEADER_KEY]: 'trace-123' } };
      const response = {};
      const host = createMockHost(request, response);

      filter.catch(exception, host);

      expect(mockHttpAdapter.reply).toHaveBeenCalledWith(
        response,
        expect.objectContaining({ statusCode: HttpStatus.NOT_FOUND }),
        HttpStatus.NOT_FOUND,
      );
    });

    it('should include error name and message from the exception', () => {
      const exception = new HttpException('Forbidden resource', HttpStatus.FORBIDDEN);
      const request = { method: 'POST', headers: {} };
      const response = {};
      const host = createMockHost(request, response);

      filter.catch(exception, host);

      const responseBody = mockHttpAdapter.reply.mock.calls[0][1] as Record<string, unknown>;
      const error = responseBody.error as { name: string; message: string };
      expect(error.name).toBe('HttpException');
      expect(error.message).toBe('Forbidden resource');
    });

    it('should include the exception response in result', () => {
      const exceptionResponse = { message: 'Validation failed', errors: ['field is required'] };
      const exception = new HttpException(exceptionResponse, HttpStatus.BAD_REQUEST);
      const request = { method: 'PUT', headers: {} };
      const response = {};
      const host = createMockHost(request, response);

      filter.catch(exception, host);

      const responseBody = mockHttpAdapter.reply.mock.calls[0][1] as Record<string, unknown>;
      expect(responseBody.result).toEqual(exceptionResponse);
    });
  });

  describe('when exception is a non-HttpException Error', () => {
    it('should reply with 500 status code', () => {
      const exception = new Error('Something broke');
      const request = { method: 'GET', headers: {} };
      const response = {};
      const host = createMockHost(request, response);

      filter.catch(exception, host);

      expect(mockHttpAdapter.reply).toHaveBeenCalledWith(
        response,
        expect.objectContaining({ statusCode: HttpStatus.INTERNAL_SERVER_ERROR }),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    });

    it('should include error name and message from the Error', () => {
      const exception = new TypeError('Cannot read property');
      const request = { method: 'GET', headers: {} };
      const response = {};
      const host = createMockHost(request, response);

      filter.catch(exception, host);

      const responseBody = mockHttpAdapter.reply.mock.calls[0][1] as Record<string, unknown>;
      const error = responseBody.error as { name: string; message: string };
      expect(error.name).toBe('TypeError');
      expect(error.message).toBe('Cannot read property');
    });
  });

  describe('when exception is a non-Error value', () => {
    it('should reply with 500 and empty error name', () => {
      const exception = 'string error';
      const request = { method: 'GET', headers: {} };
      const response = {};
      const host = createMockHost(request, response);

      filter.catch(exception, host);

      const responseBody = mockHttpAdapter.reply.mock.calls[0][1] as Record<string, unknown>;
      expect(responseBody.statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      const error = responseBody.error as { name: string; message: string };
      expect(error.name).toBe('');
      expect(error.message).toBe('');
    });
  });

  describe('traceId handling', () => {
    it('should include traceId from request headers', () => {
      const exception = new Error('fail');
      const request = { method: 'GET', headers: { [TRACE_ID_HEADER_KEY]: 'my-trace-id' } };
      const response = {};
      const host = createMockHost(request, response);

      filter.catch(exception, host);

      const responseBody = mockHttpAdapter.reply.mock.calls[0][1] as Record<string, unknown>;
      expect(responseBody.traceId).toBe('my-trace-id');
    });

    it('should default traceId to empty string when header is missing', () => {
      const exception = new Error('fail');
      const request = { method: 'GET', headers: {} };
      const response = {};
      const host = createMockHost(request, response);

      filter.catch(exception, host);

      const responseBody = mockHttpAdapter.reply.mock.calls[0][1] as Record<string, unknown>;
      expect(responseBody.traceId).toBe('');
    });
  });

  describe('logging', () => {
    it('should call logger.error with status, method, url, and message', () => {
      const exception = new HttpException('Bad Request', HttpStatus.BAD_REQUEST);
      const request = { method: 'POST', headers: {} };
      const response = {};
      const host = createMockHost(request, response);

      filter.catch(exception, host);

      expect(loggerErrorSpy).toHaveBeenCalledWith('400 | POST /test-path | Bad Request');
    });
  });

  describe('response body structure', () => {
    it('should include all required fields', () => {
      const exception = new HttpException('Error', HttpStatus.BAD_REQUEST);
      const request = { method: 'GET', headers: {} };
      const response = {};
      const host = createMockHost(request, response);

      filter.catch(exception, host);

      const responseBody = mockHttpAdapter.reply.mock.calls[0][1] as Record<string, unknown>;
      expect(responseBody).toEqual(
        expect.objectContaining({
          traceId: expect.any(String),
          statusCode: HttpStatus.BAD_REQUEST,
          timestamp: expect.any(String),
          path: '/test-path',
          ok: false,
          error: expect.objectContaining({
            name: expect.any(String),
            message: expect.any(String),
          }),
          result: expect.anything(),
        }),
      );
    });
  });

  describe('stack trace handling (non-production)', () => {
    it('should include parsed stack trace lines when not in production', () => {
      const exception = new Error('stack test');
      const request = { method: 'GET', headers: {} };
      const response = {};
      const host = createMockHost(request, response);

      filter.catch(exception, host);

      const responseBody = mockHttpAdapter.reply.mock.calls[0][1] as Record<string, unknown>;
      const error = responseBody.error as { stack: string[] };
      expect(Array.isArray(error.stack)).toBe(true);
      expect(error.stack.length).toBeGreaterThan(0);
      error.stack.forEach((line) => {
        expect(typeof line).toBe('string');
      });
    });
  });
});

describe('AllExceptionsFilter (production mode)', () => {
  let filter: AllExceptionsFilter;
  let mockHttpAdapter: ReturnType<typeof createMockHttpAdapter>;

  beforeEach(() => {
    jest.resetModules();
    jest.doMock('../../config/config', () => ({
      IS_PRODUCTION: true,
    }));

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { AllExceptionsFilter: ProdFilter } = require('../AllExceptionsFilter');
    mockHttpAdapter = createMockHttpAdapter();
    const httpAdapterHost = { httpAdapter: mockHttpAdapter } as unknown as HttpAdapterHost;
    filter = new ProdFilter(httpAdapterHost);
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetModules();
    jest.doMock('../../config/config', () => ({
      IS_PRODUCTION: false,
    }));
  });

  it('should return empty stack array in production', () => {
    const exception = new Error('prod error');
    const request = { method: 'GET', headers: {} };
    const response = {};
    const host = createMockHost(request, response);

    filter.catch(exception, host);

    const responseBody = mockHttpAdapter.reply.mock.calls[0][1] as Record<string, unknown>;
    const error = responseBody.error as { stack: string[] };
    expect(error.stack).toEqual([]);
  });
});
