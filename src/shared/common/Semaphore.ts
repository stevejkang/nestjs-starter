import { HttpException, HttpStatus } from '@nestjs/common';

interface SemaphoreOptions {
  maxConcurrency: number;
  maxQueueSize?: number;
  timeoutMs?: number;
}

interface QueueEntry {
  resolve(): void;
  reject(error: Error): void;
  timeoutHandle?: ReturnType<typeof setTimeout>;
}

export class Semaphore {
  private currentCount: number;
  private readonly queue: QueueEntry[] = [];

  constructor(private readonly options: SemaphoreOptions) {
    this.currentCount = 0;
  }

  async acquire(): Promise<void> {
    if (this.currentCount < this.options.maxConcurrency) {
      this.currentCount++;
      return;
    }

    if (
      this.options.maxQueueSize !== undefined &&
      this.queue.length >= this.options.maxQueueSize
    ) {
      throw new HttpException(
        'Too Many Requests',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return new Promise<void>((resolve, reject) => {
      const entry: QueueEntry = { resolve, reject };

      if (this.options.timeoutMs !== undefined) {
        entry.timeoutHandle = setTimeout(() => {
          const index = this.queue.indexOf(entry);

          if (index !== -1) {
            this.queue.splice(index, 1);
          }

          reject(
            new HttpException(
              'Gateway Timeout',
              HttpStatus.GATEWAY_TIMEOUT,
            ),
          );
        }, this.options.timeoutMs);
      }

      this.queue.push(entry);
    });
  }

  release(): void {
    if (this.queue.length > 0) {
      const next = this.queue.shift();

      if (next === undefined) {
        return;
      }

      if (next.timeoutHandle !== undefined) {
        clearTimeout(next.timeoutHandle);
      }

      next.resolve();
      return;
    }

    if (this.currentCount > 0) {
      this.currentCount--;
    }
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();

    try {
      return await fn();
    } finally {
      this.release();
    }
  }

  get availableSlots(): number {
    return Math.max(0, this.options.maxConcurrency - this.currentCount);
  }

  get queueLength(): number {
    return this.queue.length;
  }
}
