import { model, Schema, type InferSchemaType } from 'mongoose';
import { ALL_PERMISSIONS } from '@erp/shared';
import { tenantIdField, tenantPlugin } from '../../plugins/tenant.plugin.js';

const roleSchema = new Schema(
  {
    ...tenantIdField,
    name: { type: String, required: true, trim: true, maxlength: 50 },
    permissions: { type: [String], enum: ALL_PERMISSIONS, default: [] },
    /** System roles (seeded on registration) cannot be deleted; SuperAdmin cannot be edited. */
    isSystem: { type: Boolean, default: false },
  },
  { timestamps: true },
);

roleSchema.plugin(tenantPlugin);
roleSchema.index({ tenantId: 1, name: 1 }, { unique: true });

export type Role = InferSchemaType<typeof roleSchema>;
export const RoleModel = model('Role', roleSchema);
