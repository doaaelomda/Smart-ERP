import { model, Schema, type InferSchemaType } from 'mongoose';
import { INVOICE_STATUSES } from '@erp/shared';
import { tenantIdField, tenantPlugin } from '../../plugins/tenant.plugin.js';
import { documentLineFields, documentTotalsFields } from '../documents/document-lines.js';

const lineSchema = new Schema(
  {
    ...documentLineFields,
    /** Product average cost at issue time (for profit reports). */
    unitCost: { type: Number },
  },
  { _id: false },
);

const invoiceSchema = new Schema(
  {
    ...tenantIdField,
    /** Assigned on issue. */
    number: { type: String },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    customerName: { type: String, required: true, trim: true },
    /** Stock is taken from here when the invoice has stock lines. */
    warehouseId: { type: Schema.Types.ObjectId, ref: 'Warehouse' },
    status: { type: String, enum: INVOICE_STATUSES, default: 'draft' },
    issueDate: { type: Date },
    dueDate: { type: Date, required: true },
    lines: { type: [lineSchema], required: true },
    ...documentTotalsFields,
    paidAmount: { type: Number, default: 0 },
    notes: { type: String, trim: true, maxlength: 1000 },
    quotationId: { type: Schema.Types.ObjectId, ref: 'Quotation' },
    cancelledReason: { type: String, trim: true, maxlength: 300 },
    cancelledAt: { type: Date },
    isDeleted: { type: Boolean, default: false, select: false },
    deletedAt: { type: Date, select: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

invoiceSchema.plugin(tenantPlugin);
invoiceSchema.index({ tenantId: 1, number: 1 }, { unique: true, partialFilterExpression: { number: { $type: 'string' } } });
invoiceSchema.index({ tenantId: 1, status: 1, dueDate: 1 });
invoiceSchema.index({ tenantId: 1, customerId: 1, issueDate: -1 });
invoiceSchema.index({ tenantId: 1, isDeleted: 1, createdAt: -1 });

export type Invoice = InferSchemaType<typeof invoiceSchema>;
export const InvoiceModel = model('Invoice', invoiceSchema);
