import { model, Schema, type InferSchemaType } from 'mongoose';
import { tenantIdField, tenantPlugin } from '../../plugins/tenant.plugin.js';

const supplierSchema = new Schema(
  {
    ...tenantIdField,
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, trim: true, lowercase: true, maxlength: 254 },
    phone: { type: String, trim: true, maxlength: 30 },
    vatNumber: { type: String, trim: true, maxlength: 30 },
    address: { type: String, trim: true, maxlength: 300 },
    /** Amount we owe (minor units). Changed only by goods receipts, never by the client. */
    balance: { type: Number, default: 0 },
    notes: { type: String, trim: true, maxlength: 1000 },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false, select: false },
    deletedAt: { type: Date, select: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

supplierSchema.plugin(tenantPlugin);
supplierSchema.index({ tenantId: 1, isDeleted: 1, createdAt: -1 });
supplierSchema.index({ tenantId: 1, name: 1 });

export type Supplier = InferSchemaType<typeof supplierSchema>;
export const SupplierModel = model('Supplier', supplierSchema);
