import { Router } from 'express';
import { authenticate } from '../../core/middlewares/authenticate.js';
import { requirePermission } from '../../core/middlewares/require-permission.js';
import { validate } from '../../core/middlewares/validate.js';
import * as controller from './supplier.controller.js';
import { supplierBodySchema, supplierIdParamsSchema, updateSupplierSchema } from './supplier.validation.js';

export const supplierRouter = Router();
const byId = validate({ params: supplierIdParamsSchema });

supplierRouter.use(authenticate);

// Document screens pick suppliers too, so they can read the list.
const canRead = requirePermission('suppliers.view', 'purchaseOrders.create');

supplierRouter.get('/', canRead, controller.list);
supplierRouter.post('/', requirePermission('suppliers.create'), validate({ body: supplierBodySchema }), controller.create);
supplierRouter.get('/:id', canRead, byId, controller.getById);
supplierRouter.patch(
  '/:id',
  requirePermission('suppliers.update'),
  validate({ params: supplierIdParamsSchema, body: updateSupplierSchema }),
  controller.update,
);
supplierRouter.delete('/:id', requirePermission('suppliers.delete'), byId, controller.remove);
