import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../core/middlewares/authenticate.js';
import { validate } from '../../core/middlewares/validate.js';
import * as controller from './notification.controller.js';

/** Every user manages only their own notifications, so no extra permission is required. */
export const notificationRouter = Router();
const byId = validate({ params: z.object({ id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id') }) });

notificationRouter.use(authenticate);

notificationRouter.get('/', controller.list);
notificationRouter.get('/unread-count', controller.unreadCount);
notificationRouter.patch('/read-all', controller.markAllAsRead);
notificationRouter.patch('/:id/read', byId, controller.markAsRead);
notificationRouter.delete('/:id', byId, controller.remove);
