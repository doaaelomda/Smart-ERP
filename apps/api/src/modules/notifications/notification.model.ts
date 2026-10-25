import { model, Schema, type InferSchemaType } from 'mongoose';
import { NOTIFICATION_TYPES } from '@erp/shared';
import { tenantIdField, tenantPlugin } from '../../plugins/tenant.plugin.js';

const notificationSchema = new Schema(
  {
    ...tenantIdField,
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    /** Translation key + params so the text follows the reader's language. */
    messageKey: { type: String, required: true, maxlength: 100 },
    params: { type: Schema.Types.Mixed },
    link: { type: String, maxlength: 300 },
    readAt: { type: Date, default: null },
    /** Prevents duplicate alerts, e.g. `lowStock:<productId>` (one per user while it exists). */
    dedupeKey: { type: String, maxlength: 120 },
  },
  { timestamps: true },
);

notificationSchema.plugin(tenantPlugin);
notificationSchema.index({ tenantId: 1, userId: 1, createdAt: -1 });
notificationSchema.index({ tenantId: 1, userId: 1, readAt: 1 });
notificationSchema.index(
  { tenantId: 1, userId: 1, dedupeKey: 1 },
  { unique: true, partialFilterExpression: { dedupeKey: { $type: 'string' } } },
);

export type Notification = InferSchemaType<typeof notificationSchema>;
export const NotificationModel = model('Notification', notificationSchema);
