import type { Request, RequestHandler, Response } from 'express';
import { getValidated } from '../../core/middlewares/validate.js';
import { sendPaginated, sendSuccess } from '../../core/utils/response.js';
import type { IdParams } from '../../core/utils/validation.js';
import * as service from './quotation.service.js';
import type { ConvertQuotationBody, QuotationBody, UpdateQuotationBody } from './quotation.validation.js';

const idOf = (req: Request) => getValidated<IdParams>(req, 'params').id;

async function sendQuotation(req: Request, res: Response, id: string, status = 200) {
  sendSuccess(res, await service.getQuotationById(id, req.auth!.permissions), status);
}

export const list: RequestHandler = async (req, res) => {
  const { items, meta } = await service.listQuotations(req.query as Record<string, unknown>);
  sendPaginated(res, items, meta);
};

export const getById: RequestHandler = async (req, res) => sendQuotation(req, res, idOf(req));

export const create: RequestHandler = async (req, res) => {
  const quotation = await service.createQuotation(req.body as QuotationBody);
  await sendQuotation(req, res, quotation._id.toString(), 201);
};

export const update: RequestHandler = async (req, res) => {
  await service.updateQuotation(idOf(req), req.body as UpdateQuotationBody);
  await sendQuotation(req, res, idOf(req));
};

export const remove: RequestHandler = async (req, res) => {
  await service.deleteQuotation(idOf(req));
  res.status(204).end();
};

export const changeStatus =
  (action: 'send' | 'accept' | 'reject'): RequestHandler =>
  async (req, res) => {
    await service.changeQuotationStatus(idOf(req), action);
    await sendQuotation(req, res, idOf(req));
  };

/** Returns the new draft invoice id. */
export const convert: RequestHandler = async (req, res) => {
  const invoice = await service.convertQuotation(idOf(req), req.body as ConvertQuotationBody);
  sendSuccess(res, { invoiceId: invoice._id.toString() }, 201);
};
