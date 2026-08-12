import { Request, Response, NextFunction } from 'express';
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Snowflake } from '../common/Snowflake';
import { RequestContext } from '../context/RequestContext';

export const TRACE_ID_HEADER_KEY = 'X-Trace-Id';

@Injectable()
export class TraceIdIssuanceMiddleware implements NestMiddleware {
  async use(request: Request, response: Response, next: NextFunction): Promise<void> {
    const traceId = Snowflake.generate();

    request.headers[TRACE_ID_HEADER_KEY] = traceId;
    response.setHeader(TRACE_ID_HEADER_KEY, traceId);

    RequestContext.run({ traceId }, () => {
      next();
    });
  }
}
