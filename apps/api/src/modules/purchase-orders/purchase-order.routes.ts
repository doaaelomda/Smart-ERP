import { Router } from 'express';
import { authenticate } from '../../core/middlewares/authenticate.js';
import { requirePermission } from '../../core/middlewares/require-permission.js';
import { validate } from '../../core/middlewares/validate.js';
import { idParamsSchema } from '../../core/utils/validation.js';
import * as controller from './purchase-order.controller.js';
import {
  purchaseOrderBodySchema,
  receivePurchaseOrderSchema,
  updatePurchaseOrderSchema,
} from './purchase-order.validation.js';

export const purchaseOrderRouter = Router();
const byId = validate({ params: idParamsSchema });

purchaseOrderRouter.use(authenticate);

purchaseOrderRouter.get('/', requirePermission('purchaseOrders.view'), controller.list);
purchaseOrderRouter.post('/', requirePermission('purchaseOrders.create'), validate({ body: purchaseOrderBodySchema }), controller.create);
purchaseOrderRouter.get('/:id', requirePermission('purchaseOrders.view'), byId, controller.getById);
purchaseOrderRouter.patch(
  '/:id',
  requirePermission('purchaseOrders.update'),
  validate({ params: idParamsSchema, body: updatePurchaseOrderSchema }),
  controller.update,
);
purchaseOrderRouter.delete('/:id', requirePermission('purchaseOrders.update'), byId, controller.remove);
purchaseOrderRouter.post('/:id/send', requirePermission('purchaseOrders.update'), byId, controller.send);
purchaseOrderRouter.post(
  '/:id/receive',
  requirePermission('purchaseOrders.receive'),
  validate({ params: idParamsSchema, body: receivePurchaseOrderSchema }),
  controller.receive,
);
purchaseOrderRouter.post('/:id/cancel', requirePermission('purchaseOrders.cancel'), byId, controller.cancel);
