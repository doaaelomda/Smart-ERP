import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import { useTestDatabase } from '../../test/db.js';
import { CustomerModel } from './customer.model.js';
import { loginAdmin } from '../../test/api-client.js';

useTestDatabase();
const app = createApp();

async function registerTenant(email = 'owner@example.com', companyName = 'Nile Trading') {
  const res = await loginAdmin(app, email, companyName);
  expect(res.status).toBe(200);
  return `Bearer ${res.body.data.accessToken as string}`;
}

const api = (token: string) => ({
  list: (query = '') => request(app).get(`/api/v1/customers${query}`).set('Authorization', token),
  create: (body: object) => request(app).post('/api/v1/customers').set('Authorization', token).send(body),
  get: (id: string) => request(app).get(`/api/v1/customers/${id}`).set('Authorization', token),
  update: (id: string, body: object) =>
    request(app).patch(`/api/v1/customers/${id}`).set('Authorization', token).send(body),
  remove: (id: string) => request(app).delete(`/api/v1/customers/${id}`).set('Authorization', token),
});

describe('/customers', () => {
  it('requires authentication', async () => {
    const res = await request(app).get('/api/v1/customers');
    expect(res.status).toBe(401);
  });

  it('creates, reads, updates and soft-deletes a customer', async () => {
    const c = api(await registerTenant());

    const created = await c.create({ name: 'Delta Supplies', email: 'INFO@delta.com', creditLimit: 500000, phone: '' });
    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({ name: 'Delta Supplies', email: 'info@delta.com', balance: 0, isActive: true });
    expect(created.body.data.phone).toBeUndefined();
    const id = created.body.data._id as string;

    expect((await c.get(id)).body.data.name).toBe('Delta Supplies');

    const updated = await c.update(id, { name: 'Delta Co', balance: 999 });
    expect(updated.status).toBe(200);
    expect(updated.body.data.name).toBe('Delta Co');
    expect(updated.body.data.balance).toBe(0); // balance is not client-writable

    expect((await c.remove(id)).status).toBe(204);
    expect((await c.get(id)).status).toBe(404);
    expect((await c.list()).body.meta.total).toBe(0);
  });

  it('supports search, sort and pagination', async () => {
    const c = api(await registerTenant());
    for (const name of ['Alpha', 'Beta', 'Gamma']) await c.create({ name });

    const page = await c.list('?sort=name&limit=2&page=1');
    expect(page.body.data.map((x: { name: string }) => x.name)).toEqual(['Alpha', 'Beta']);
    expect(page.body.meta).toEqual({ page: 1, limit: 2, total: 3, totalPages: 2 });

    const search = await c.list('?search=gam');
    expect(search.body.data).toHaveLength(1);
  });

  it('isolates tenants', async () => {
    const a = api(await registerTenant('a@example.com', 'A Co'));
    const b = api(await registerTenant('b@example.com', 'B Co'));
    const id = (await a.create({ name: 'Only A' })).body.data._id as string;

    expect((await b.list()).body.meta.total).toBe(0);
    expect((await b.get(id)).status).toBe(404);
    expect((await b.update(id, { name: 'Hacked' })).status).toBe(404);
  });

  it('validates input and blocks deleting a customer with a balance', async () => {
    const c = api(await registerTenant());
    const bad = await c.create({ name: 'A', email: 'nope', creditLimit: -1 });
    expect(bad.status).toBe(400);
    expect(bad.body.error.details.map((d: { path: string }) => d.path)).toEqual(['name', 'email', 'creditLimit']);

    expect((await c.get('123')).status).toBe(400);

    const id = (await c.create({ name: 'Owes money' })).body.data._id as string;
    await CustomerModel.updateOne({ _id: id }, { balance: 1000 }).setOptions({ skipTenant: true });
    expect((await c.remove(id)).status).toBe(409);
  });
});
