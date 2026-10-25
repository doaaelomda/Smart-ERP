import { model, Schema, type InferSchemaType } from 'mongoose';
import { tenantIdField, tenantPlugin } from '../../plugins/tenant.plugin.js';

const stockLevelSchema = new Schema(
  {
    ...tenantIdField,
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    warehouseId: { type: Schema.Types.ObjectId, ref: 'Warehouse', required: true },
    quantity: { type: Number, required: true, default: 0 },
  },
  { timestamps: true },
);

stockLevelSchema.plugin(tenantPlugin);
stockLevelSchema.index({ tenantId: 1, productId: 1, warehouseId: 1 }, { unique: true });
stockLevelSchema.index({ tenantId: 1, warehouseId: 1 });

export type StockLevel = InferSchemaType<typeof stockLevelSchema>;
export const StockLevelModel = model('StockLevel', stockLevelSchema);
