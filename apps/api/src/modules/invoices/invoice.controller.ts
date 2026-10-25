import type { RequestHandler } from 'express';
import { getValidated } from '../../core/middlewares/validate.js';
import { sendPaginated, sendSuccess } from '../../core/utils/response.js';
import type { IdParams } from '../../core/utils/validation.js';
import * as service from './invoice.service.js';
import type { CancelInvoiceBody, InvoiceBody, UpdateInvoiceBody } from './invoice.validation.js';

const idOf = (req: Parameters<RequestHandler>[0]) => getValidated<IdParams>(req, 'params').id;

/** Single-invoice responses always include the `actions` the user may take next. */
async function sendInvoice(req: Parameters<RequestHandler>[0], res: Parameters<RequestHandler>[1], id: string, status = 200) {
  sendSuccess(res, await service.getInvoiceById(id, req.auth!.permissions), status);
}

export const list: RequestHandler = async (req, res) => {
  const { items, meta } = await service.listInvoices(req.query as Record<string, unknown>);
  sendPaginated(res, items, meta);
};

export const getById: RequestHandler = async (req, res) => sendInvoice(req, res, idOf(req));

export const create: RequestHandler = async (req, res) => {
  const invoice = await service.createInvoice(req.body as InvoiceBody);
  await sendInvoice(req, res, invoice._id.toString(), 201);
};

export const update: RequestHandler = async (req, res) => {
  await service.updateInvoice(idOf(req), req.body as UpdateInvoiceBody);
  await sendInvoice(req, res, idOf(req));
};

export const remove: RequestHandler = async (req, res) => {
  await service.deleteInvoice(idOf(req));
  res.status(204).end();
};

export const issue: RequestHandler = async (req, res) => {
  await service.issueInvoice(idOf(req));
  await sendInvoice(req, res, idOf(req));
};

export const cancel: RequestHandler = async (req, res) => {
  await service.cancelInvoice(idOf(req), req.body as CancelInvoiceBody);
  await sendInvoice(req, res, idOf(req));
};
