import { Router } from 'express';
import { authenticate } from '../../core/middlewares/authenticate.js';
import { authRateLimit } from '../../core/middlewares/rate-limit.js';
import { validate } from '../../core/middlewares/validate.js';
import * as controller from './auth.controller.js';
import { loginSchema, registerSchema } from './auth.validation.js';

export const authRouter = Router();

authRouter.post('/register', authRateLimit, validate({ body: registerSchema }), controller.register);
authRouter.post('/login', authRateLimit, validate({ body: loginSchema }), controller.login);
authRouter.post('/refresh', controller.refresh);
authRouter.post('/logout', controller.logout);
authRouter.get('/me', authenticate, controller.me);
