import { Router } from 'express';
import { authenticate } from '../../core/middlewares/authenticate.js';
import { requirePermission } from '../../core/middlewares/require-permission.js';
import { validate } from '../../core/middlewares/validate.js';
import { idParamsSchema } from '../../core/utils/validation.js';
import * as controller from './payment.controller.js';
import { paymentBodySchema } from './payment.validation.js';

export const paymentRouter = Router();

paymentRouter.use(authenticate);

paymentRouter.get('/', requirePermission('payments.view', 'invoices.view'), controller.list);
paymentRouter.post('/', requirePermission('payments.create'), validate({ body: paymentBodySchema }), controller.create);
paymentRouter.get('/:id', requirePermission('payments.view'), validate({ params: idParamsSchema }), controller.getById);
