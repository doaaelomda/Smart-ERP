export const NOTIFICATION_TYPES = ['lowStock', 'overdue', 'latePo', 'system'] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

/** In-app notification as returned by the API. Text is a translation key + params. */
export interface NotificationDto {
  _id: string;
  type: NotificationType;
  messageKey: string;
  params?: Record<string, string | number>;
  link?: string;
  readAt?: string | null;
  createdAt: string;
}
