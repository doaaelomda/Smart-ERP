import { model, Schema, type InferSchemaType } from 'mongoose';
import { STOCK_MOVEMENT_TYPES, STOCK_REF_TYPES } from '@erp/shared';
import { tenantIdField, tenantPlugin } from '../../plugins/tenant.plugin.js';

/** Append-only stock ledger. */
const stockMovementSchema = new Schema(
  {
    ...tenantIdField,
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    warehouseId: { type: Schema.Types.ObjectId, ref: 'Warehouse', required: true },
    type: { type: String, enum: STOCK_MOVEMENT_TYPES, required: true },
    /** Signed: negative = out. */
    quantity: { type: Number, required: true },
    /** Minor units. */
    unitCost: { type: Number, required: true, default: 0 },
    refType: { type: String, enum: STOCK_REF_TYPES, required: true },
    refId: { type: Schema.Types.ObjectId },
    reason: { type: String, trim: true, maxlength: 300 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

stockMovementSchema.plugin(tenantPlugin);
stockMovementSchema.index({ tenantId: 1, productId: 1, createdAt: -1 });
stockMovementSchema.index({ tenantId: 1, createdAt: -1 });

export type StockMovement = InferSchemaType<typeof stockMovementSchema>;
export const StockMovementModel = model('StockMovement', stockMovementSchema);
