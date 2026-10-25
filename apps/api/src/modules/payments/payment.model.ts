import { model, Schema, type InferSchemaType } from 'mongoose';
import { PAYMENT_METHODS } from '@erp/shared';
import { tenantIdField, tenantPlugin } from '../../plugins/tenant.plugin.js';

const paymentSchema = new Schema(
  {
    ...tenantIdField,
    number: { type: String, required: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    customerName: { type: String, required: true },
    invoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice', required: true },
    invoiceNumber: { type: String, required: true },
    /** Minor units. */
    amount: { type: Number, required: true, min: 1 },
    method: { type: String, enum: PAYMENT_METHODS, required: true },
    date: { type: Date, required: true },
    reference: { type: String, trim: true, maxlength: 80 },
    notes: { type: String, trim: true, maxlength: 500 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

paymentSchema.plugin(tenantPlugin);
paymentSchema.index({ tenantId: 1, number: 1 }, { unique: true });
paymentSchema.index({ tenantId: 1, invoiceId: 1 });
paymentSchema.index({ tenantId: 1, customerId: 1, date: -1 });

export type Payment = InferSchemaType<typeof paymentSchema>;
export const PaymentModel = model('Payment', paymentSchema);
