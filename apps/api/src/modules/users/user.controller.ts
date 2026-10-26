import type { RequestHandler } from 'express';
import { getValidated } from '../../core/middlewares/validate.js';
import { sendPaginated, sendSuccess } from '../../core/utils/response.js';
import * as service from './user.service.js';
import type { CreateUserInput, UpdateUserInput } from './user.validation.js';

type IdParams = { id: string };

export const list: RequestHandler = async (req, res) => {
  const { items, meta } = await service.listUsers(req.query as Record<string, unknown>);
  sendPaginated(res, items, meta);
};

export const roles: RequestHandler = async (_req, res) => {
  sendSuccess(res, await service.listRoles());
};

export const create: RequestHandler = async (req, res) => {
  sendSuccess(res, await service.createUser(req.body as CreateUserInput), 201);
};

export const update: RequestHandler = async (req, res) => {
  const { id } = getValidated<IdParams>(req, 'params');
  sendSuccess(res, await service.updateUser(id, req.body as UpdateUserInput));
};

export const remove: RequestHandler = async (req, res) => {
  await service.deleteUser(getValidated<IdParams>(req, 'params').id);
  res.status(204).end();
};
