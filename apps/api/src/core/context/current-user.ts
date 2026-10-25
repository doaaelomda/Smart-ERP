import { getRequestContext } from './request-context.js';

/** Current user id for createdBy/updatedBy audit fields. */
export function currentUserId(): string | undefined {
  return getRequestContext()?.userId;
}

export function currentTenantId(): string {
  const tenantId = getRequestContext()?.tenantId;
  if (!tenantId) throw new Error('Tenant context is missing');
  return tenantId;
}
