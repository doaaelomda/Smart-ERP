import { Router } from 'express';
import { isDatabaseConnected } from '../../config/db.js';
import { sendSuccess } from '../../core/utils/response.js';

export const healthRouter = Router();

healthRouter.get('/', (_req, res) => {
  sendSuccess(res, {
    status: 'ok',
    database: isDatabaseConnected() ? 'connected' : 'disconnected',
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});
