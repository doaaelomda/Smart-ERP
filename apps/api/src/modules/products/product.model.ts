import { model, Schema, type InferSchemaType } from 'mongoose';
import { PRODUCT_TYPES } from '@erp/shared';
import { tenantIdField, tenantPlugin } from '../../plugins/tenant.plugin.js';

const productSchema = new Schema(
  {
    ...tenantIdField,
    type: { type: String, enum: PRODUCT_TYPES, required: true, default: 'stock' },
    sku: { type: String, required: true, trim: true, uppercase: true, maxlength: 40 },
    barcode: { type: String, trim: true, maxlength: 40 },
    name: { type: String, required: true, trim: true, maxlength: 150 },
    category: { type: String, trim: true, maxlength: 60 },
    unit: { type: String, trim: true, maxlength: 20, default: 'pcs' },
    /** Minor units. */
    salePrice: { type: Number, required: true, min: 0 },
    /** Weighted average cost (minor units). */
    avgCost: { type: Number, default: 0, min: 0 },
    vatApplicable: { type: Boolean, default: true },
    reorderLevel: { type: Number, min: 0 },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false, select: false },
    deletedAt: { type: Date, select: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

productSchema.plugin(tenantPlugin);
productSchema.index({ tenantId: 1, sku: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });
productSchema.index({ tenantId: 1, isDeleted: 1, createdAt: -1 });

export type Product = InferSchemaType<typeof productSchema>;
export const ProductModel = model('Product', productSchema);
