import { Router } from 'express';
import { authenticate } from '../../core/middlewares/authenticate.js';
import { requirePermission } from '../../core/middlewares/require-permission.js';
import { validate } from '../../core/middlewares/validate.js';
import { idParamsSchema } from '../../core/utils/validation.js';
import * as controller from './quotation.controller.js';
import { convertQuotationSchema, quotationBodySchema, updateQuotationSchema } from './quotation.validation.js';

export const quotationRouter = Router();
const byId = validate({ params: idParamsSchema });

quotationRouter.use(authenticate);

quotationRouter.get('/', requirePermission('quotations.view'), controller.list);
quotationRouter.post('/', requirePermission('quotations.create'), validate({ body: quotationBodySchema }), controller.create);
quotationRouter.get('/:id', requirePermission('quotations.view'), byId, controller.getById);
quotationRouter.patch(
  '/:id',
  requirePermission('quotations.update'),
  validate({ params: idParamsSchema, body: updateQuotationSchema }),
  controller.update,
);
quotationRouter.delete('/:id', requirePermission('quotations.update'), byId, controller.remove);
quotationRouter.post('/:id/send', requirePermission('quotations.update'), byId, controller.changeStatus('send'));
quotationRouter.post('/:id/accept', requirePermission('quotations.update'), byId, controller.changeStatus('accept'));
quotationRouter.post('/:id/reject', requirePermission('quotations.update'), byId, controller.changeStatus('reject'));
quotationRouter.post(
  '/:id/convert',
  requirePermission('quotations.convert'),
  requirePermission('invoices.create'),
  validate({ params: idParamsSchema, body: convertQuotationSchema }),
  controller.convert,
);
