import { Observable, of, from, throwError } from 'rxjs';
import { switchMap, tap, catchError } from 'rxjs/operators';
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
  Inject,
  ConflictException,
  HttpStatus,
} from '@nestjs/common';
import { CacheClient, CACHE_CLIENT } from '../cache/interfaces';

const PROCESSING_MARKER = '__processing__';
const PROCESSING_TTL_SECONDS = 300;
const RESULT_TTL_SECONDS = 10800;

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  private readonly logger = new Logger(IdempotencyInterceptor.name);

  constructor(@Inject(CACHE_CLIENT) private readonly cacheClient: CacheClient) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<{ headers: Record<string, string> }>();
    const idempotencyKey = request.headers['idempotency-key'];

    if (!idempotencyKey) {
      return next.handle();
    }

    const cacheKey = `idempotency:${idempotencyKey}`;
    const processingKey = `${cacheKey}:processing`;

    return from(this.checkCache(cacheKey, processingKey)).pipe(
      switchMap((cached) => {
        if (cached !== null) {
          const parsed = JSON.parse(cached) as { statusCode: number; body: unknown };
          const response = http.getResponse<{ statusCode: number }>();
          response.statusCode = parsed.statusCode;
          return of(parsed.body);
        }

        return from(this.setProcessingMarker(processingKey)).pipe(
          switchMap(() => next.handle()),
          tap((body) => {
            const response = http.getResponse<{ statusCode: number }>();
            const statusCode = response.statusCode;

            if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
              this.cleanupProcessingMarker(processingKey);
              return;
            }

            const value = JSON.stringify({ statusCode, body });
            this.cacheClient
              .set(cacheKey, value, RESULT_TTL_SECONDS)
              .then(() => this.cacheClient.del([processingKey]))
              .catch((error: unknown) => {
                this.logger.warn(`Failed to cache idempotency result: ${error}`);
              });
          }),
        );
      }),
      catchError((error: unknown) => {
        if (error instanceof ConflictException) {
          return throwError(() => error);
        }
        this.logger.warn(`Idempotency cache error, falling through: ${error}`);
        return next.handle();
      }),
    );
  }

  private async checkCache(cacheKey: string, processingKey: string): Promise<string | null> {
    const cached = await this.cacheClient.get(cacheKey);
    if (cached !== null) {
      return cached;
    }

    const processing = await this.cacheClient.get(processingKey);
    if (processing === PROCESSING_MARKER) {
      throw new ConflictException(
        'A request with this Idempotency-Key is already being processed',
      );
    }

    return null;
  }

  private async setProcessingMarker(processingKey: string): Promise<void> {
    await this.cacheClient.set(processingKey, PROCESSING_MARKER, PROCESSING_TTL_SECONDS);
  }

  private cleanupProcessingMarker(processingKey: string): void {
    this.cacheClient.del([processingKey]).catch((error: unknown) => {
      this.logger.warn(`Failed to clean up processing marker: ${error}`);
    });
  }
}
