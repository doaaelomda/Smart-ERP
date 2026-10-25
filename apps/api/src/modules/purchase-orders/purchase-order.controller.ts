import type { Request, RequestHandler, Response } from 'express';
import { getValidated } from '../../core/middlewares/validate.js';
import { sendPaginated, sendSuccess } from '../../core/utils/response.js';
import type { IdParams } from '../../core/utils/validation.js';
import * as service from './purchase-order.service.js';
import type { PurchaseOrderBody, ReceivePurchaseOrderBody, UpdatePurchaseOrderBody } from './purchase-order.validation.js';

const idOf = (req: Request) => getValidated<IdParams>(req, 'params').id;

async function sendPurchaseOrder(req: Request, res: Response, id: string, status = 200) {
  sendSuccess(res, await service.getPurchaseOrderById(id, req.auth!.permissions), status);
}

export const list: RequestHandler = async (req, res) => {
  const { items, meta } = await service.listPurchaseOrders(req.query as Record<string, unknown>);
  sendPaginated(res, items, meta);
};

export const getById: RequestHandler = async (req, res) => sendPurchaseOrder(req, res, idOf(req));

export const create: RequestHandler = async (req, res) => {
  const po = await service.createPurchaseOrder(req.body as PurchaseOrderBody);
  await sendPurchaseOrder(req, res, po._id.toString(), 201);
};

export const update: RequestHandler = async (req, res) => {
  await service.updatePurchaseOrder(idOf(req), req.body as UpdatePurchaseOrderBody);
  await sendPurchaseOrder(req, res, idOf(req));
};

export const remove: RequestHandler = async (req, res) => {
  await service.deletePurchaseOrder(idOf(req));
  res.status(204).end();
};

export const send: RequestHandler = async (req, res) => {
  await service.sendPurchaseOrder(idOf(req));
  await sendPurchaseOrder(req, res, idOf(req));
};

export const receive: RequestHandler = async (req, res) => {
  await service.receivePurchaseOrder(idOf(req), req.body as ReceivePurchaseOrderBody);
  await sendPurchaseOrder(req, res, idOf(req));
};

export const cancel: RequestHandler = async (req, res) => {
  await service.cancelPurchaseOrder(idOf(req));
  await sendPurchaseOrder(req, res, idOf(req));
};
