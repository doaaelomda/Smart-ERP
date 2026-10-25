import { Router } from 'express';
import { authenticate } from '../../core/middlewares/authenticate.js';
import { requirePermission } from '../../core/middlewares/require-permission.js';
import { validate } from '../../core/middlewares/validate.js';
import * as controller from './customer.controller.js';
import { customerBodySchema, customerIdParamsSchema, updateCustomerSchema } from './customer.validation.js';

export const customerRouter = Router();
const byId = validate({ params: customerIdParamsSchema });

customerRouter.use(authenticate);

// Document screens pick customers too, so they can read the list.
const canRead = requirePermission('customers.view', 'invoices.create', 'quotations.create', 'payments.create');

customerRouter.get('/', canRead, controller.list);
customerRouter.post('/', requirePermission('customers.create'), validate({ body: customerBodySchema }), controller.create);
customerRouter.get('/:id', canRead, byId, controller.getById);
customerRouter.patch(
  '/:id',
  requirePermission('customers.update'),
  validate({ params: customerIdParamsSchema, body: updateCustomerSchema }),
  controller.update,
);
customerRouter.delete('/:id', requirePermission('customers.delete'), byId, controller.remove);
