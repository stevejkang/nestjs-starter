import { HttpException, HttpStatus } from '@nestjs/common';

import { Semaphore } from '../Semaphore';

describe('Semaphore', () => {
  describe('basic acquire/release flow', () => {
    it('should acquire immediately when slots are available', async () => {
      const semaphore = new Semaphore({ maxConcurrency: 2 });

      await semaphore.acquire();

      expect(semaphore.availableSlots).toEqual(1);
    });

    it('should release a slot', async () => {
      const semaphore = new Semaphore({ maxConcurrency: 2 });

      await semaphore.acquire();
      semaphore.release();

      expect(semaphore.availableSlots).toEqual(2);
    });

    it('should handle multiple sequential acquire/release cycles', async () => {
      const semaphore = new Semaphore({ maxConcurrency: 1 });

      for (let i = 0; i < 5; i++) {
        await semaphore.acquire();
        expect(semaphore.availableSlots).toEqual(0);
        semaphore.release();
        expect(semaphore.availableSlots).toEqual(1);
      }
    });
  });

  describe('concurrency limit enforcement', () => {
    it('should make the N+1th acquire wait when all slots are taken', async () => {
      const semaphore = new Semaphore({ maxConcurrency: 2 });

      await semaphore.acquire();
      await semaphore.acquire();

      let resolved = false;
      const waiting = semaphore.acquire().then(() => {
        resolved = true;
      });

      await Promise.resolve();
      expect(resolved).toEqual(false);
      expect(semaphore.queueLength).toEqual(1);

      semaphore.release();
      await waiting;
      expect(resolved).toEqual(true);
    });

    it('should resolve queued requests in FIFO order', async () => {
      const semaphore = new Semaphore({ maxConcurrency: 1 });
      const order: number[] = [];

      await semaphore.acquire();

      const first = semaphore.acquire().then(() => order.push(1));
      const second = semaphore.acquire().then(() => order.push(2));

      semaphore.release();
      await first;
      semaphore.release();
      await second;

      expect(order).toEqual([1, 2]);
    });
  });

  describe('availableSlots and queueLength getters', () => {
    it('should report correct availableSlots', async () => {
      const semaphore = new Semaphore({ maxConcurrency: 3 });

      expect(semaphore.availableSlots).toEqual(3);

      await semaphore.acquire();
      expect(semaphore.availableSlots).toEqual(2);

      await semaphore.acquire();
      expect(semaphore.availableSlots).toEqual(1);

      await semaphore.acquire();
      expect(semaphore.availableSlots).toEqual(0);
    });

    it('should report correct queueLength', async () => {
      const semaphore = new Semaphore({ maxConcurrency: 1 });

      expect(semaphore.queueLength).toEqual(0);

      await semaphore.acquire();
      semaphore.acquire();
      semaphore.acquire();

      await Promise.resolve();
      expect(semaphore.queueLength).toEqual(2);

      semaphore.release();
      await Promise.resolve();
      expect(semaphore.queueLength).toEqual(1);

      semaphore.release();
      await Promise.resolve();
      expect(semaphore.queueLength).toEqual(0);
    });
  });

  describe('queue overflow (429)', () => {
    it('should throw HttpException with 429 when queue is full', async () => {
      const semaphore = new Semaphore({ maxConcurrency: 1, maxQueueSize: 1 });

      await semaphore.acquire();
      semaphore.acquire();

      await expect(semaphore.acquire()).rejects.toThrow(HttpException);
      await expect(semaphore.acquire()).rejects.toMatchObject({
        response: 'Too Many Requests',
        status: HttpStatus.TOO_MANY_REQUESTS,
      });

      semaphore.release();
      semaphore.release();
    });

    it('should allow acquire after queue drains below maxQueueSize', async () => {
      const semaphore = new Semaphore({ maxConcurrency: 1, maxQueueSize: 1 });

      await semaphore.acquire();
      const queued = semaphore.acquire();

      semaphore.release();
      await queued;

      const nextQueued = semaphore.acquire();

      await Promise.resolve();
      expect(semaphore.queueLength).toEqual(1);

      semaphore.release();
      await nextQueued;
      semaphore.release();
    });
  });

  describe('timeout (504)', () => {
    it('should throw HttpException with 504 when acquire times out', async () => {
      jest.useFakeTimers();

      const semaphore = new Semaphore({
        maxConcurrency: 1,
        timeoutMs: 1000,
      });

      await semaphore.acquire();

      const acquirePromise = semaphore.acquire();

      jest.advanceTimersByTime(1000);

      await expect(acquirePromise).rejects.toThrow(HttpException);
      semaphore.release();
      jest.useRealTimers();
    });

    it('should remove timed-out request from queue', async () => {
      jest.useFakeTimers();

      const semaphore = new Semaphore({
        maxConcurrency: 1,
        timeoutMs: 500,
      });

      await semaphore.acquire();

      const timedOutPromise = semaphore.acquire();
      expect(semaphore.queueLength).toEqual(1);

      jest.advanceTimersByTime(500);

      await timedOutPromise.catch(() => undefined);
      expect(semaphore.queueLength).toEqual(0);

      semaphore.release();
      jest.useRealTimers();
    });

    it('should clear timeout when acquire succeeds before timeout', async () => {
      jest.useFakeTimers();

      const semaphore = new Semaphore({
        maxConcurrency: 1,
        timeoutMs: 5000,
      });

      await semaphore.acquire();

      const acquirePromise = semaphore.acquire();

      semaphore.release();
      await acquirePromise;

      jest.advanceTimersByTime(5000);

      expect(semaphore.availableSlots).toEqual(0);

      semaphore.release();
      jest.useRealTimers();
    });
  });

  describe('execute()', () => {
    it('should run function and release slot', async () => {
      const semaphore = new Semaphore({ maxConcurrency: 1 });

      const result = await semaphore.execute(async () => 'done');

      expect(result).toEqual('done');
      expect(semaphore.availableSlots).toEqual(1);
    });

    it('should release slot when function throws', async () => {
      const semaphore = new Semaphore({ maxConcurrency: 1 });

      await expect(
        semaphore.execute(async () => {
          throw new Error('boom');
        }),
      ).rejects.toThrow('boom');

      expect(semaphore.availableSlots).toEqual(1);
    });

    it('should respect concurrency limit', async () => {
      const semaphore = new Semaphore({ maxConcurrency: 2 });
      let concurrent = 0;
      let maxConcurrent = 0;

      const task = async () => {
        concurrent++;
        maxConcurrent = Math.max(maxConcurrent, concurrent);
        await new Promise((resolve) => setTimeout(resolve, 10));
        concurrent--;
      };

      await Promise.all([
        semaphore.execute(task),
        semaphore.execute(task),
        semaphore.execute(task),
        semaphore.execute(task),
      ]);

      expect(maxConcurrent).toEqual(2);
    });
  });
});
