import { RequestContext } from '../RequestContext';

describe('RequestContext', () => {
  describe('getTraceId', () => {
    it('should return empty string when called outside any run scope', () => {
      expect(RequestContext.getTraceId()).toBe('');
    });

    it('should return the traceId set in the current run scope', () => {
      const traceId = '7060530237620224000';

      RequestContext.run({ traceId }, () => {
        expect(RequestContext.getTraceId()).toBe(traceId);
      });
    });

    it('should return empty string after the run scope exits', () => {
      RequestContext.run({ traceId: '7060530237620224000' }, () => {
        // inside scope — traceId is available
      });

      expect(RequestContext.getTraceId()).toBe('');
    });
  });

  describe('run', () => {
    it('should return the value produced by the callback', () => {
      const result = RequestContext.run({ traceId: '123' }, () => {
        return 42;
      });

      expect(result).toBe(42);
    });

    it('should isolate nested run scopes', () => {
      RequestContext.run({ traceId: 'outer' }, () => {
        expect(RequestContext.getTraceId()).toBe('outer');

        RequestContext.run({ traceId: 'inner' }, () => {
          expect(RequestContext.getTraceId()).toBe('inner');
        });

        expect(RequestContext.getTraceId()).toBe('outer');
      });
    });

    it('should propagate traceId across async boundaries', async () => {
      await RequestContext.run({ traceId: 'async-trace' }, async () => {
        await new Promise<void>((resolve) => {
          setTimeout(() => {
            resolve();
          }, 10);
        });

        expect(RequestContext.getTraceId()).toBe('async-trace');
      });
    });
  });
});
