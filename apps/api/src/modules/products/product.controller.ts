import type { RequestHandler } from 'express';
import { getValidated } from '../../core/middlewares/validate.js';
import { sendPaginated, sendSuccess } from '../../core/utils/response.js';
import type { IdParams } from '../../core/utils/validation.js';
import * as service from './product.service.js';
import type { ProductBody, UpdateProductBody } from './product.validation.js';

export const list: RequestHandler = async (req, res) => {
  const { items, meta } = await service.listProducts(req.query as Record<string, unknown>);
  sendPaginated(res, items, meta);
};

export const getById: RequestHandler = async (req, res) => {
  sendSuccess(res, await service.getProductById(getValidated<IdParams>(req, 'params').id));
};

export const create: RequestHandler = async (req, res) => {
  sendSuccess(res, await service.createProduct(req.body as ProductBody), 201);
};

export const update: RequestHandler = async (req, res) => {
  sendSuccess(res, await service.updateProduct(getValidated<IdParams>(req, 'params').id, req.body as UpdateProductBody));
};

export const remove: RequestHandler = async (req, res) => {
  await service.deleteProduct(getValidated<IdParams>(req, 'params').id);
  res.status(204).end();
};
