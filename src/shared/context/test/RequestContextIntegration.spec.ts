import request from 'supertest';
import { Controller, Get, INestApplication, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { RequestContext } from '../RequestContext';
import { TraceIdIssuanceMiddleware, TRACE_ID_HEADER_KEY } from '../../middlewares/TraceIdIssuanceMiddleware';

@Controller('probe')
class ProbeController {
  @Get()
  getTraceId(): { traceId: string } {
    return { traceId: RequestContext.getTraceId() };
  }
}

@Module({
  controllers: [ProbeController],
})
class TestModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(TraceIdIssuanceMiddleware).forRoutes('*');
  }
}

describe('RequestContext Integration', () => {
  // KNOWN UNTESTED SURFACE: context propagation into guards, interceptors,
  // and exception filters is not asserted here. Nothing in this repo currently
  // consumes RequestContext in those layers — AllExceptionsFilter and
  // CoreResponseInterceptor read traceId from request headers by design.

  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [TestModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should propagate traceId from middleware into route handler via AsyncLocalStorage', async () => {
    const response = await request(app.getHttpServer()).get('/probe').expect(200);

    const bodyTraceId = response.body.traceId as string;
    const headerTraceId = response.headers[TRACE_ID_HEADER_KEY.toLowerCase()] as string;

    expect(bodyTraceId).toBeDefined();
    expect(bodyTraceId.length).toBeGreaterThan(0);
    expect(bodyTraceId).toBe(headerTraceId);
  });

  it('should issue unique traceIds for separate requests', async () => {
    const response1 = await request(app.getHttpServer()).get('/probe').expect(200);
    const response2 = await request(app.getHttpServer()).get('/probe').expect(200);

    const traceId1 = response1.body.traceId as string;
    const traceId2 = response2.body.traceId as string;

    expect(traceId1).not.toBe(traceId2);
  });
});
