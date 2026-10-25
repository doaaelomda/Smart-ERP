import { model, Schema, type InferSchemaType } from 'mongoose';
import { LANGUAGES } from '@erp/shared';
import { tenantIdField, tenantPlugin } from '../../plugins/tenant.plugin.js';

const userSchema = new Schema(
  {
    ...tenantIdField,
    name: { type: String, required: true, trim: true, maxlength: 80 },
    /** Unique across the platform so login needs only email + password. */
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    passwordHash: { type: String, required: true, select: false },
    roleId: { type: Schema.Types.ObjectId, ref: 'Role', required: true },
    isActive: { type: Boolean, default: true },
    language: { type: String, enum: LANGUAGES, default: 'ar' },
    lastLoginAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        delete ret['passwordHash'];
        return ret;
      },
    },
  },
);

userSchema.plugin(tenantPlugin);
userSchema.index({ email: 1 }, { unique: true });

export type User = InferSchemaType<typeof userSchema>;
export const UserModel = model('User', userSchema);
