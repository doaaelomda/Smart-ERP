import { Router } from 'express';
import { authenticate } from '../../core/middlewares/authenticate.js';
import { requirePermission } from '../../core/middlewares/require-permission.js';
import { validate } from '../../core/middlewares/validate.js';
import { idParamsSchema } from '../../core/utils/validation.js';
import * as controller from './product.controller.js';
import { productBodySchema, updateProductSchema } from './product.validation.js';

export const productRouter = Router();
const byId = validate({ params: idParamsSchema });

productRouter.use(authenticate);

// Sales/purchasing screens pick products too, so any of these can read the list.
const canReadProducts = requirePermission('products.view', 'invoices.create', 'quotations.create', 'purchaseOrders.create', 'stock.view');

productRouter.get('/', canReadProducts, controller.list);
productRouter.post('/', requirePermission('products.create'), validate({ body: productBodySchema }), controller.create);
productRouter.get('/:id', canReadProducts, byId, controller.getById);
productRouter.patch(
  '/:id',
  requirePermission('products.update'),
  validate({ params: idParamsSchema, body: updateProductSchema }),
  controller.update,
);
productRouter.delete('/:id', requirePermission('products.delete'), byId, controller.remove);
