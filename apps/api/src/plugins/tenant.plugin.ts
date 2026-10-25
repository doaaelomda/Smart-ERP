import { Schema, Types, type Aggregate, type Query } from 'mongoose';
import { getCurrentTenantId } from '../core/context/request-context.js';

const QUERY_HOOKS = [
  'countDocuments',
  'deleteMany',
  'deleteOne',
  'find',
  'findOne',
  'findOneAndDelete',
  'findOneAndReplace',
  'findOneAndUpdate',
  'replaceOne',
  'updateMany',
  'updateOne',
] as const;

/** Spread into every tenant-owned schema definition (keeps `tenantId` in the inferred TS type). */
export const tenantIdField = {
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true, immutable: true },
} as const;

class MissingTenantError extends Error {
  constructor(model: string) {
    super(`Tenant context is missing for a query on "${model}". Use { skipTenant: true } only for cross-tenant queries.`);
    this.name = 'MissingTenantError';
  }
}

/**
 * Multi-tenancy guard:
 * - adds a required, indexed `tenantId` to the schema
 * - scopes every query/aggregate to the current tenant from the request context
 * - fails loudly when there is no tenant context (instead of leaking data),
 *   unless the query explicitly opts out with `.setOptions({ skipTenant: true })`.
 */
export function tenantPlugin(schema: Schema): void {
  if (!schema.path('tenantId')) {
    throw new Error('tenantPlugin: add `...tenantIdField` to the schema definition');
  }

  function scopeQuery(this: Query<unknown, unknown>) {
    if (this.getOptions()['skipTenant']) return;
    const tenantId = getCurrentTenantId();
    if (!tenantId) throw new MissingTenantError(this.model.modelName);
    this.where({ tenantId });
  }
  for (const hook of QUERY_HOOKS) schema.pre(hook, scopeQuery);

  schema.pre('aggregate', function (this: Aggregate<unknown>) {
    if ((this.options as Record<string, unknown>)['skipTenant']) return;
    const tenantId = getCurrentTenantId();
    if (!tenantId) throw new MissingTenantError('aggregate');
    this.pipeline().unshift({ $match: { tenantId: new Types.ObjectId(tenantId) } });
  });

  schema.pre('validate', function () {
    if (!this.get('tenantId')) {
      const tenantId = getCurrentTenantId();
      if (tenantId) this.set('tenantId', tenantId);
    }
  });
}
