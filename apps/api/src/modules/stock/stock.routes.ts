import { Router } from 'express';
import { authenticate } from '../../core/middlewares/authenticate.js';
import { requirePermission } from '../../core/middlewares/require-permission.js';
import { validate } from '../../core/middlewares/validate.js';
import * as controller from './stock.controller.js';
import { adjustmentSchema, transferSchema } from './stock.validation.js';

export const stockRouter = Router();

stockRouter.use(authenticate);

stockRouter.get('/levels', requirePermission('stock.view', 'invoices.create'), controller.levels);
stockRouter.get('/movements', requirePermission('stock.view'), controller.movements);
stockRouter.post('/adjustments', requirePermission('stock.adjust'), validate({ body: adjustmentSchema }), controller.adjust);
stockRouter.post('/transfers', requirePermission('stock.transfer'), validate({ body: transferSchema }), controller.transfer);
