import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { errorHandler } from './error-handler.js';
import { getValidated, validate } from './validate.js';

const app = express();
app.use(express.json());
app.post(
  '/items/:id',
  validate({
    params: z.object({ id: z.string().length(3) }),
    query: z.object({ dryRun: z.coerce.boolean().default(false) }),
    body: z.object({ name: z.string().min(2), qty: z.number().int().positive() }),
  }),
  (req, res) => {
    res.json({ body: req.body, query: getValidated(req, 'query') });
  },
);
app.use(errorHandler);

describe('validate middleware', () => {
  it('passes parsed values and strips unknown keys', async () => {
    const res = await request(app)
      .post('/items/abc?dryRun=1')
      .send({ name: 'Pen', qty: 2, hack: true });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ body: { name: 'Pen', qty: 2 }, query: { dryRun: true } });
  });

  it('returns 400 with field details', async () => {
    const res = await request(app).post('/items/abc').send({ name: 'P', qty: -1 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.map((d: { path: string }) => d.path)).toEqual(['name', 'qty']);
  });
});
