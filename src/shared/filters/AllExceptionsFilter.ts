import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { IS_PRODUCTION } from '../config/config';
import { TRACE_ID_HEADER_KEY } from '../middlewares/TraceIdIssuanceMiddleware';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;

    const ctx = host.switchToHttp();
    const httpStatus = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const httpRequest = ctx.getRequest();
    const httpResponse = ctx.getResponse();

    const httpMethod = httpRequest.method;
    const httpUrl = httpAdapter.getRequestUrl(httpRequest);

    const stack = exception instanceof Error ? exception.stack : (exception as string);
    const errorName = exception instanceof Error ? exception.name : '';
    const errorMessage = exception instanceof Error ? exception.message : '';

    const traceId = httpRequest.headers[TRACE_ID_HEADER_KEY] || '';

    const responseBody = {
      traceId: traceId,
      statusCode: httpStatus,
      timestamp: new Date().toISOString(),
      path: httpUrl,
      ok: false,
      error: {
        name: errorName,
        message: errorMessage,
        stack:
          this.needToShowStack() && stack
            ? stack
                .toString()
                .split('\n')
                .slice(1)
                .map((line) => line.trim())
            : [],
      },
      result: {},
    };

    if (exception instanceof HttpException) {
      responseBody.result = exception.getResponse();
    }

    this.logger.error(`${httpStatus} | ${httpMethod} ${httpUrl} | ${errorMessage}`);

    httpAdapter.reply(httpResponse, responseBody, httpStatus);
  }

  private needToShowStack(): boolean {
    return !IS_PRODUCTION;
  }
}
