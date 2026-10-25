import { AsyncLocalStorage } from 'node:async_hooks';

export interface RequestContext {
  tenantId: string;
  userId: string;
}

/**
 * Per-request context (tenant + user) available anywhere in the async call chain,
 * e.g. inside Mongoose middleware, without passing it through every function.
 */
const storage = new AsyncLocalStorage<RequestContext>();

export function runWithContext<T>(context: RequestContext, fn: () => T): T {
  return storage.run(context, fn);
}

export function getRequestContext(): RequestContext | undefined {
  return storage.getStore();
}

export function getCurrentTenantId(): string | undefined {
  return storage.getStore()?.tenantId;
}
