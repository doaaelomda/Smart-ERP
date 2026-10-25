import type { RequestHandler } from 'express';
import { getValidated } from '../../core/middlewares/validate.js';
import { sendSuccess } from '../../core/utils/response.js';
import * as service from './notification.service.js';

type IdParams = { id: string };

export const list: RequestHandler = async (req, res) => {
  const { items, meta } = await service.listNotifications(req.auth!.userId, req.query as Record<string, unknown>);
  res.status(200).json({ success: true, data: items, meta });
};

export const unreadCount: RequestHandler = async (req, res) => {
  sendSuccess(res, { count: await service.countUnread(req.auth!.userId) });
};

export const markAsRead: RequestHandler = async (req, res) => {
  await service.markNotificationAsRead(req.auth!.userId, getValidated<IdParams>(req, 'params').id);
  res.status(204).end();
};

export const markAllAsRead: RequestHandler = async (req, res) => {
  await service.markAllNotificationsAsRead(req.auth!.userId);
  res.status(204).end();
};

export const remove: RequestHandler = async (req, res) => {
  await service.deleteNotification(req.auth!.userId, getValidated<IdParams>(req, 'params').id);
  res.status(204).end();
};
