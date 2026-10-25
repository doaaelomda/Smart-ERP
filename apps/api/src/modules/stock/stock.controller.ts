import type { RequestHandler } from 'express';
import { sendPaginated } from '../../core/utils/response.js';
import * as service from './stock.service.js';
import type { AdjustmentBody, TransferBody } from './stock.validation.js';

export const levels: RequestHandler = async (req, res) => {
  const { items, meta } = await service.listStockLevels(req.query as Record<string, unknown>);
  sendPaginated(res, items, meta);
};

export const movements: RequestHandler = async (req, res) => {
  const { items, meta } = await service.listStockMovements(req.query as Record<string, unknown>);
  sendPaginated(res, items, meta);
};

export const adjust: RequestHandler = async (req, res) => {
  await service.adjustStock(req.body as AdjustmentBody);
  res.status(204).end();
};

export const transfer: RequestHandler = async (req, res) => {
  await service.transferStock(req.body as TransferBody);
  res.status(204).end();
};
