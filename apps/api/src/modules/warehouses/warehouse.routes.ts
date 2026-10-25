import { Router } from 'express';
import { authenticate } from '../../core/middlewares/authenticate.js';
import { requirePermission } from '../../core/middlewares/require-permission.js';
import { validate } from '../../core/middlewares/validate.js';
import { idParamsSchema } from '../../core/utils/validation.js';
import * as controller from './warehouse.controller.js';
import { updateWarehouseSchema, warehouseBodySchema } from './warehouse.validation.js';

export const warehouseRouter = Router();
const byId = validate({ params: idParamsSchema });

warehouseRouter.use(authenticate);

// Stock, invoice and PO screens choose a warehouse, so they can read the list.
const canRead = requirePermission('warehouses.view', 'stock.view', 'invoices.create', 'purchaseOrders.create');

warehouseRouter.get('/', canRead, controller.list);
warehouseRouter.post('/', requirePermission('warehouses.manage'), validate({ body: warehouseBodySchema }), controller.create);
warehouseRouter.get('/:id', canRead, byId, controller.getById);
warehouseRouter.patch(
  '/:id',
  requirePermission('warehouses.manage'),
  validate({ params: idParamsSchema, body: updateWarehouseSchema }),
  controller.update,
);
warehouseRouter.delete('/:id', requirePermission('warehouses.manage'), byId, controller.remove);
