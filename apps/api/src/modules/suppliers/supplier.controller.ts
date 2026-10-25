import type { RequestHandler } from 'express';
import { getValidated } from '../../core/middlewares/validate.js';
import { sendPaginated, sendSuccess } from '../../core/utils/response.js';
import * as service from './supplier.service.js';
import type { CreateSupplierInput, UpdateSupplierInput } from './supplier.validation.js';

type IdParams = { id: string };

export const list: RequestHandler = async (req, res) => {
  const { items, meta } = await service.listSuppliers(req.query as Record<string, unknown>);
  sendPaginated(res, items, meta);
};

export const getById: RequestHandler = async (req, res) => {
  sendSuccess(res, await service.getSupplierById(getValidated<IdParams>(req, 'params').id));
};

export const create: RequestHandler = async (req, res) => {
  sendSuccess(res, await service.createSupplier(req.body as CreateSupplierInput), 201);
};

export const update: RequestHandler = async (req, res) => {
  const { id } = getValidated<IdParams>(req, 'params');
  sendSuccess(res, await service.updateSupplier(id, req.body as UpdateSupplierInput));
};

export const remove: RequestHandler = async (req, res) => {
  await service.deleteSupplier(getValidated<IdParams>(req, 'params').id);
  res.status(204).end();
};
