import type { RequestHandler } from 'express';
import { getValidated } from '../../core/middlewares/validate.js';
import { sendPaginated, sendSuccess } from '../../core/utils/response.js';
import type { IdParams } from '../../core/utils/validation.js';
import * as service from './payment.service.js';
import type { PaymentBody } from './payment.validation.js';

export const list: RequestHandler = async (req, res) => {
  const { items, meta } = await service.listPayments(req.query as Record<string, unknown>);
  sendPaginated(res, items, meta);
};

export const getById: RequestHandler = async (req, res) => {
  sendSuccess(res, await service.getPaymentById(getValidated<IdParams>(req, 'params').id));
};

export const create: RequestHandler = async (req, res) => {
  sendSuccess(res, await service.createPayment(req.body as PaymentBody), 201);
};
