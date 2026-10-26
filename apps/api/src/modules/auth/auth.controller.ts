import type { RequestHandler } from 'express';
import { sendSuccess } from '../../core/utils/response.js';
import * as authService from './auth.service.js';
import type { LoginInput } from './auth.validation.js';

export const login: RequestHandler = async (req, res) => {
  sendSuccess(res, await authService.login(req.body as LoginInput));
};

export const me: RequestHandler = async (req, res) => {
  sendSuccess(res, await authService.buildAuthUser(req.auth!.userId));
};
