import { model, Schema, type InferSchemaType } from 'mongoose';
import { QUOTATION_STATUSES } from '@erp/shared';
import { tenantIdField, tenantPlugin } from '../../plugins/tenant.plugin.js';
import { documentLineFields, documentTotalsFields } from '../documents/document-lines.js';

const quotationSchema = new Schema(
  {
    ...tenantIdField,
    number: { type: String, required: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    customerName: { type: String, required: true, trim: true },
    status: { type: String, enum: QUOTATION_STATUSES, default: 'draft' },
    validUntil: { type: Date, required: true },
    lines: { type: [new Schema(documentLineFields, { _id: false })], required: true },
    ...documentTotalsFields,
    notes: { type: String, trim: true, maxlength: 1000 },
    /** Set when converted. */
    invoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice' },
    isDeleted: { type: Boolean, default: false, select: false },
    deletedAt: { type: Date, select: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

quotationSchema.plugin(tenantPlugin);
quotationSchema.index({ tenantId: 1, number: 1 }, { unique: true });
quotationSchema.index({ tenantId: 1, isDeleted: 1, createdAt: -1 });
quotationSchema.index({ tenantId: 1, customerId: 1, createdAt: -1 });

export type Quotation = InferSchemaType<typeof quotationSchema>;
export const QuotationModel = model('Quotation', quotationSchema);
