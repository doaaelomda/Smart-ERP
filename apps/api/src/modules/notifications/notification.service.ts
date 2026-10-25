import type { NotificationType, Permission } from '@erp/shared';
import { AppError } from '../../core/errors/app-error.js';
import { buildPaginationMeta, parseListQuery } from '../../core/utils/list-query.js';
import { RoleModel } from '../roles/role.model.js';
import { UserModel } from '../users/user.model.js';
import { NotificationModel } from './notification.model.js';

const LIST_OPTIONS = {
  sortable: ['createdAt', 'type'],
  searchable: ['messageKey'],
  filterable: ['type'],
  defaultSort: '-createdAt',
} as const;

export async function listNotifications(userId: string, rawQuery: Record<string, unknown>) {
  const { filter, sort, skip, limit, page } = parseListQuery(rawQuery, LIST_OPTIONS);
  if (rawQuery['unread'] === 'true') filter['readAt'] = null;
  const where = { ...filter, userId };

  const [items, total, unreadCount] = await Promise.all([
    NotificationModel.find(where).sort(sort).skip(skip).limit(limit).select('-dedupeKey').lean(),
    NotificationModel.countDocuments(where),
    countUnread(userId),
  ]);
  return { items, meta: { ...buildPaginationMeta(total, page, limit), unreadCount } };
}

export function countUnread(userId: string) {
  return NotificationModel.countDocuments({ userId, readAt: null });
}

export async function markNotificationAsRead(userId: string, id: string) {
  const result = await NotificationModel.updateOne({ _id: id, userId, readAt: null }, { $set: { readAt: new Date() } });
  if (result.matchedCount === 0 && !(await NotificationModel.exists({ _id: id, userId }))) {
    throw AppError.notFound('Notification not found');
  }
}

export async function markAllNotificationsAsRead(userId: string) {
  await NotificationModel.updateMany({ userId, readAt: null }, { $set: { readAt: new Date() } });
}

export async function deleteNotification(userId: string, id: string) {
  const result = await NotificationModel.deleteOne({ _id: id, userId });
  if (result.deletedCount === 0) throw AppError.notFound('Notification not found');
}

export interface NotifyInput {
  tenantId: string;
  type: NotificationType;
  messageKey: string;
  params?: Record<string, string | number>;
  link?: string;
  dedupeKey?: string;
  /** Explicit recipients... */
  userIds?: string[];
  /** ...or every active user whose role has this permission. */
  permission?: Permission;
}

/**
 * Used by business code and background jobs (low stock, overdue invoices, late POs).
 * Works outside a request (jobs) because tenantId is passed explicitly.
 * Returns the number of notifications created (deduplicated ones are skipped).
 */
export async function notify(input: NotifyInput): Promise<number> {
  const { tenantId } = input;
  let userIds = input.userIds ?? [];

  if (input.permission) {
    const roles = await RoleModel.find({ tenantId, permissions: input.permission })
      .setOptions({ skipTenant: true })
      .select('_id')
      .lean();
    const users = await UserModel.find({ tenantId, isActive: true, roleId: { $in: roles.map((r) => r._id) } })
      .setOptions({ skipTenant: true })
      .select('_id')
      .lean();
    userIds = [...new Set([...userIds, ...users.map((u) => u._id.toString())])];
  }
  if (userIds.length === 0) return 0;

  const docs = userIds.map((userId) => ({
    tenantId,
    userId,
    type: input.type,
    messageKey: input.messageKey,
    params: input.params,
    link: input.link,
    dedupeKey: input.dedupeKey,
  }));

  try {
    const created = await NotificationModel.insertMany(docs, { ordered: false });
    return created.length;
  } catch (err) {
    // ordered:false inserts the rest; only duplicate dedupeKeys are expected here.
    // Each write error exposes `code` directly or under `err` depending on the driver/mongoose layer.
    type WriteErr = { code?: number; err?: { code?: number } };
    const e = err as { code?: number; insertedDocs?: unknown[]; writeErrors?: WriteErr | WriteErr[] };
    const writeErrors = e.writeErrors ? [e.writeErrors].flat() : [];
    const onlyDuplicates =
      writeErrors.length > 0 ? writeErrors.every((w) => (w.code ?? w.err?.code) === 11000) : e.code === 11000;
    if (!onlyDuplicates) throw err;
    return e.insertedDocs?.length ?? 0;
  }
}
