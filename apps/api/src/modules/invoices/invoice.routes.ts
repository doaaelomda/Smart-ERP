import { Router } from 'express';
import { authenticate } from '../../core/middlewares/authenticate.js';
import { requirePermission } from '../../core/middlewares/require-permission.js';
import { validate } from '../../core/middlewares/validate.js';
import { idParamsSchema } from '../../core/utils/validation.js';
import * as controller from './invoice.controller.js';
import { cancelInvoiceSchema, invoiceBodySchema, updateInvoiceSchema } from './invoice.validation.js';

export const invoiceRouter = Router();
const byId = validate({ params: idParamsSchema });

invoiceRouter.use(authenticate);

invoiceRouter.get('/', requirePermission('invoices.view', 'payments.create'), controller.list);
invoiceRouter.post('/', requirePermission('invoices.create'), validate({ body: invoiceBodySchema }), controller.create);
invoiceRouter.get('/:id', requirePermission('invoices.view'), byId, controller.getById);
invoiceRouter.patch(
  '/:id',
  requirePermission('invoices.update'),
  validate({ params: idParamsSchema, body: updateInvoiceSchema }),
  controller.update,
);
invoiceRouter.delete('/:id', requirePermission('invoices.update'), byId, controller.remove);
invoiceRouter.post('/:id/issue', requirePermission('invoices.issue'), byId, controller.issue);
invoiceRouter.post(
  '/:id/cancel',
  requirePermission('invoices.cancel'),
  validate({ params: idParamsSchema, body: cancelInvoiceSchema }),
  controller.cancel,
);
