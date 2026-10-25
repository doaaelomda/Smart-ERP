import { model, Schema, type InferSchemaType } from 'mongoose';
import { PURCHASE_ORDER_STATUSES } from '@erp/shared';
import { tenantIdField, tenantPlugin } from '../../plugins/tenant.plugin.js';
import { documentLineFields, documentTotalsFields } from '../documents/document-lines.js';

/** `unitPrice` is the purchase unit cost. */
const lineSchema = new Schema({ ...documentLineFields, receivedQty: { type: Number, default: 0, min: 0 } }, { _id: false });

const purchaseOrderSchema = new Schema(
  {
    ...tenantIdField,
    number: { type: String, required: true },
    supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true },
    supplierName: { type: String, required: true, trim: true },
    /** Goods are received into this warehouse. */
    warehouseId: { type: Schema.Types.ObjectId, ref: 'Warehouse', required: true },
    status: { type: String, enum: PURCHASE_ORDER_STATUSES, default: 'draft' },
    orderDate: { type: Date, required: true },
    expectedDate: { type: Date },
    lines: { type: [lineSchema], required: true },
    ...documentTotalsFields,
    notes: { type: String, trim: true, maxlength: 1000 },
    isDeleted: { type: Boolean, default: false, select: false },
    deletedAt: { type: Date, select: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

purchaseOrderSchema.plugin(tenantPlugin);
purchaseOrderSchema.index({ tenantId: 1, number: 1 }, { unique: true });
purchaseOrderSchema.index({ tenantId: 1, isDeleted: 1, createdAt: -1 });
purchaseOrderSchema.index({ tenantId: 1, status: 1, expectedDate: 1 });

export type PurchaseOrder = InferSchemaType<typeof purchaseOrderSchema>;
export const PurchaseOrderModel = model('PurchaseOrder', purchaseOrderSchema);
