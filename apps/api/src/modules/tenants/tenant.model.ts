import { model, Schema, type InferSchemaType } from 'mongoose';
import { LANGUAGES } from '@erp/shared';

const tenantSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    vatNumber: { type: String, trim: true, maxlength: 20 },
    vatRate: { type: Number, required: true, default: 14, min: 0, max: 100 },
    currency: { type: String, required: true, default: 'EGP', uppercase: true, minlength: 3, maxlength: 3 },
    defaultLanguage: { type: String, enum: LANGUAGES, default: 'ar' },
    status: { type: String, enum: ['active', 'suspended'], default: 'active', index: true },
  },
  { timestamps: true },
);

export type Tenant = InferSchemaType<typeof tenantSchema>;
export const TenantModel = model('Tenant', tenantSchema);
