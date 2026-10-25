import { model, Schema, type InferSchemaType } from 'mongoose';
import { tenantIdField, tenantPlugin } from '../../plugins/tenant.plugin.js';

const warehouseSchema = new Schema(
  {
    ...tenantIdField,
    name: { type: String, required: true, trim: true, maxlength: 80 },
    code: { type: String, trim: true, uppercase: true, maxlength: 20 },
    address: { type: String, trim: true, maxlength: 300 },
    /** Used when a document doesn't specify a warehouse. Exactly one per tenant. */
    isDefault: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false, select: false },
    deletedAt: { type: Date, select: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

warehouseSchema.plugin(tenantPlugin);
warehouseSchema.index({ tenantId: 1, name: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });

export type Warehouse = InferSchemaType<typeof warehouseSchema>;
export const WarehouseModel = model('Warehouse', warehouseSchema);
