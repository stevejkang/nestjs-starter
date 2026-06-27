import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { CallHandler, ExecutionContext, HttpStatus, Injectable, NestInterceptor } from '@nestjs/common';
import { TRACE_ID_HEADER_KEY } from '../middlewares/TraceIdIssuanceMiddleware';

@Injectable()
export class CoreResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((data) => {
        const ctx = context.switchToHttp();
        const request = ctx.getRequest();
        const response = ctx.getResponse();
        const statusCode: number = response.statusCode;

        if (statusCode === HttpStatus.NO_CONTENT) {
          return data;
        }

        const traceId = request.headers[TRACE_ID_HEADER_KEY] || '';

        return {
          traceId,
          statusCode,
          timestamp: new Date().toISOString(),
          path: request.originalUrl,
          ok: true,
          result: data ?? {},
        };
      }),
    );
  }
}
