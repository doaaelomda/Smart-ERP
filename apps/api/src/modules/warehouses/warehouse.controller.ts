import type { RequestHandler } from 'express';
import { getValidated } from '../../core/middlewares/validate.js';
import { sendPaginated, sendSuccess } from '../../core/utils/response.js';
import type { IdParams } from '../../core/utils/validation.js';
import * as service from './warehouse.service.js';
import type { UpdateWarehouseBody, WarehouseBody } from './warehouse.validation.js';

export const list: RequestHandler = async (req, res) => {
  const { items, meta } = await service.listWarehouses(req.query as Record<string, unknown>);
  sendPaginated(res, items, meta);
};

export const getById: RequestHandler = async (req, res) => {
  sendSuccess(res, await service.getWarehouseById(getValidated<IdParams>(req, 'params').id));
};

export const create: RequestHandler = async (req, res) => {
  sendSuccess(res, await service.createWarehouse(req.body as WarehouseBody), 201);
};

export const update: RequestHandler = async (req, res) => {
  sendSuccess(res, await service.updateWarehouse(getValidated<IdParams>(req, 'params').id, req.body as UpdateWarehouseBody));
};

export const remove: RequestHandler = async (req, res) => {
  await service.deleteWarehouse(getValidated<IdParams>(req, 'params').id);
  res.status(204).end();
};
