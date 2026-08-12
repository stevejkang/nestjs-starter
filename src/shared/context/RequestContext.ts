import { AsyncLocalStorage } from 'node:async_hooks';

interface RequestStore {
  traceId: string;
}

const asyncLocalStorage = new AsyncLocalStorage<RequestStore>();

export class RequestContext {
  static run<T>(store: RequestStore, fn: () => T): T {
    return asyncLocalStorage.run(store, fn);
  }

  static getTraceId(): string {
    return asyncLocalStorage.getStore()?.traceId ?? '';
  }
}
