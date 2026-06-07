import { Request, Response } from 'express';
import { TraceIdIssuanceMiddleware, TRACE_ID_HEADER_KEY } from '../TraceIdIssuanceMiddleware';
import { Snowflake } from '../../common/Snowflake';

jest.mock('../../common/Snowflake');

const mockedSnowflake = jest.mocked(Snowflake);

function createMockRequest(headers: Record<string, string> = {}): Request {
  return {
    headers: { ...headers },
  } as unknown as Request;
}

function createMockResponse(): { response: Response; setHeaderMock: jest.Mock } {
  const setHeaderMock = jest.fn();
  const response = {
    setHeader: setHeaderMock,
  } as unknown as Response;
  return { response, setHeaderMock };
}

describe('TraceIdIssuanceMiddleware', () => {
  let middleware: TraceIdIssuanceMiddleware;
  let nextFn: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    middleware = new TraceIdIssuanceMiddleware();
    nextFn = jest.fn();
    mockedSnowflake.generate.mockReturnValue('7060530237620224000');
  });

  it('should set the trace ID header on the request', async () => {
    const request = createMockRequest();
    const { response } = createMockResponse();

    await middleware.use(request, response, nextFn);

    expect(request.headers[TRACE_ID_HEADER_KEY]).toBe('7060530237620224000');
  });

  it('should set the trace ID header on the response', async () => {
    const request = createMockRequest();
    const { response, setHeaderMock } = createMockResponse();

    await middleware.use(request, response, nextFn);

    expect(setHeaderMock).toHaveBeenCalledWith(TRACE_ID_HEADER_KEY, '7060530237620224000');
  });

  it('should call next()', async () => {
    const request = createMockRequest();
    const { response } = createMockResponse();

    await middleware.use(request, response, nextFn);

    expect(nextFn).toHaveBeenCalledTimes(1);
  });

  it('should set the same trace ID on both request and response', async () => {
    const request = createMockRequest();
    const { response, setHeaderMock } = createMockResponse();

    await middleware.use(request, response, nextFn);

    const requestTraceId = request.headers[TRACE_ID_HEADER_KEY];
    const responseTraceId = setHeaderMock.mock.calls[0][1] as string;
    expect(requestTraceId).toBe(responseTraceId);
  });

  it('should generate a non-empty trace ID', async () => {
    const request = createMockRequest();
    const { response } = createMockResponse();

    await middleware.use(request, response, nextFn);

    const traceId = request.headers[TRACE_ID_HEADER_KEY];
    expect(typeof traceId).toBe('string');
    expect((traceId as string).length).toBeGreaterThan(0);
  });

  it('should call Snowflake.generate() to create the trace ID', async () => {
    const request = createMockRequest();
    const { response } = createMockResponse();

    await middleware.use(request, response, nextFn);

    expect(mockedSnowflake.generate).toHaveBeenCalledTimes(1);
  });
});
