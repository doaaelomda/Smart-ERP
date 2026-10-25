import type { Request, RequestHandler } from 'express';
import { AppError } from '../../core/errors/app-error.js';
import { sendSuccess } from '../../core/utils/response.js';
import { clearRefreshCookie, readRefreshCookie, setRefreshCookie } from './auth.cookies.js';
import * as authService from './auth.service.js';
import type { LoginInput, RegisterInput } from './auth.validation.js';

function clientInfo(req: Request): authService.ClientInfo {
  return { userAgent: req.get('user-agent'), ip: req.ip };
}

export const register: RequestHandler = async (req, res) => {
  const { session, refreshToken } = await authService.register(req.body as RegisterInput, clientInfo(req));
  setRefreshCookie(res, refreshToken);
  sendSuccess(res, session, 201);
};

export const login: RequestHandler = async (req, res) => {
  const { session, refreshToken } = await authService.login(req.body as LoginInput, clientInfo(req));
  setRefreshCookie(res, refreshToken);
  sendSuccess(res, session);
};

export const refresh: RequestHandler = async (req, res) => {
  const token = readRefreshCookie(req);
  if (!token) throw AppError.unauthorized('No refresh token');
  try {
    const { session, refreshToken } = await authService.refresh(token, clientInfo(req));
    setRefreshCookie(res, refreshToken);
    sendSuccess(res, session);
  } catch (err) {
    clearRefreshCookie(res);
    throw err;
  }
};

export const logout: RequestHandler = async (req, res) => {
  await authService.logout(readRefreshCookie(req));
  clearRefreshCookie(res);
  res.status(204).end();
};

export const me: RequestHandler = async (req, res) => {
  sendSuccess(res, await authService.buildAuthUser(req.auth!.userId));
};
