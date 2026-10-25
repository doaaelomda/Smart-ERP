import { model, Schema, type ClientSession } from 'mongoose';
import { tenantIdField, tenantPlugin } from '../../plugins/tenant.plugin.js';

const counterSchema = new Schema({
  ...tenantIdField,
  /** e.g. `invoice:2026` */
  key: { type: String, required: true },
  seq: { type: Number, required: true, default: 0 },
});

counterSchema.plugin(tenantPlugin);
counterSchema.index({ tenantId: 1, key: 1 }, { unique: true });

export const CounterModel = model('Counter', counterSchema);

/** Atomically returns the next number for `key` in the current tenant (spec 8.6). tenantId comes from the tenant plugin's query scope. */
export async function nextSequence(key: string, session?: ClientSession): Promise<number> {
  const counter = await CounterModel.findOneAndUpdate(
    { key },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: 'after', session },
  ).lean();
  return counter!.seq;
}

/** INV-2026-0001 */
export function formatSequence(prefix: string, year: number, seq: number): string {
  return `${prefix}-${year}-${String(seq).padStart(4, '0')}`;
}

/** Next formatted document number for the current year, e.g. nextDocumentNumber('invoice', 'INV') -> INV-2026-0007. */
export async function nextDocumentNumber(kind: string, prefix: string, session?: ClientSession): Promise<string> {
  const year = new Date().getFullYear();
  return formatSequence(prefix, year, await nextSequence(`${kind}:${year}`, session));
}
