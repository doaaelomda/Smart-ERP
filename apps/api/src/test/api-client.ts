import request from 'supertest';
import { expect } from 'vitest';
import type { Express } from 'express';
import { createAdmin } from '../modules/auth/auth.service.js';

/** Creates a company with its admin and logs in; returns the login response. */
export async function loginAdmin(app: Express, email: string, companyName: string, name = 'Admin', language: 'en' | 'ar' = 'en') {
  await createAdmin({ companyName, name, email, password: 'secret123', language });
  return request(app).post('/api/v1/auth/login').send({ email, password: 'secret123' });
}

/** Creates a company with its admin and returns a small authenticated client for tests. */
export async function registerTenant(app: Express, email = 'owner@example.com', companyName = 'Nile Trading') {
  await createAdmin({ companyName, name: 'Admin', email, password: 'secret123', language: 'en' });
  const res = await request(app).post('/api/v1/auth/login').send({ email, password: 'secret123' });
  expect(res.status).toBe(200);
  const token = `Bearer ${res.body.data.accessToken as string}`;
  const tenantId = res.body.data.user.tenant.id as string;
  const url = (path: string) => `/api/v1${path}`;

  return {
    tenantId,
    get: (path: string) => request(app).get(url(path)).set('Authorization', token),
    post: (path: string, body: object = {}) => request(app).post(url(path)).set('Authorization', token).send(body),
    patch: (path: string, body: object = {}) => request(app).patch(url(path)).set('Authorization', token).send(body),
    delete: (path: string) => request(app).delete(url(path)).set('Authorization', token),
  };
}

export type TestClient = Awaited<ReturnType<typeof registerTenant>>;

export async function createId(client: TestClient, path: string, body: object): Promise<string> {
  const res = await client.post(path, body);
  expect(res.status, JSON.stringify(res.body)).toBe(201);
  return res.body.data._id as string;
}
