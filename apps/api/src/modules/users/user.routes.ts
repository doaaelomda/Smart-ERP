import { Router } from 'express';
import { authenticate } from '../../core/middlewares/authenticate.js';
import { requirePermission } from '../../core/middlewares/require-permission.js';
import { validate } from '../../core/middlewares/validate.js';
import * as controller from './user.controller.js';
import { createUserSchema, updateUserSchema, userIdParamsSchema } from './user.validation.js';

export const userRouter = Router();

userRouter.use(authenticate);

userRouter.get('/', requirePermission('users.view'), controller.list);
userRouter.get('/roles', requirePermission('users.view'), controller.roles);
userRouter.post('/', requirePermission('users.create'), validate({ body: createUserSchema }), controller.create);
userRouter.patch(
  '/:id',
  requirePermission('users.update'),
  validate({ params: userIdParamsSchema, body: updateUserSchema }),
  controller.update,
);
userRouter.delete('/:id', requirePermission('users.delete'), validate({ params: userIdParamsSchema }), controller.remove);
