import type { RequestHandler } from 'express';
import { getValidated } from '../../core/middlewares/validate.js';
import { sendPaginated, sendSuccess } from '../../core/utils/response.js';
import * as service from './customer.service.js';
import type { CreateCustomerInput, UpdateCustomerInput } from './customer.validation.js';

type IdParams = { id: string };

export const list: RequestHandler = async (req, res) => {
  const { items, meta } = await service.listCustomers(req.query as Record<string, unknown>);
  sendPaginated(res, items, meta);
};

export const getById: RequestHandler = async (req, res) => {
  sendSuccess(res, await service.getCustomerById(getValidated<IdParams>(req, 'params').id));
};

export const create: RequestHandler = async (req, res) => {
  sendSuccess(res, await service.createCustomer(req.body as CreateCustomerInput), 201);
};

export const update: RequestHandler = async (req, res) => {
  const { id } = getValidated<IdParams>(req, 'params');
  sendSuccess(res, await service.updateCustomer(id, req.body as UpdateCustomerInput));
};

export const remove: RequestHandler = async (req, res) => {
  await service.deleteCustomer(getValidated<IdParams>(req, 'params').id);
  res.status(204).end();
};
