import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import { registerTenant } from '../../test/api-client.js';
import { useTestDatabase } from '../../test/db.js';

useTestDatabase();
const app = createApp();

async function accountantRoleId(admin: Awaited<ReturnType<typeof registerTenant>>) {
  const roles = (await admin.get('/users/roles')).body.data as { _id: string; name: string }[];
  return roles.find((r) => r.name === 'Accountant')!._id;
}

describe('/users', () => {
  it('lets the admin create, list, update and delete users', async () => {
    const admin = await registerTenant(app);
    const roleId = await accountantRoleId(admin);

    const created = await admin.post('/users', { name: 'Mona', email: 'Mona@Example.com', password: 'secret123', roleId });
    expect(created.status).toBe(201);
    expect(created.body.data.role.name).toBe('Accountant');
    expect(created.body.data.passwordHash).toBeUndefined();

    const duplicate = await admin.post('/users', { name: 'Mona 2', email: 'mona@example.com', password: 'secret123', roleId });
    expect(duplicate.status).toBe(409);

    expect((await admin.get('/users')).body.data).toHaveLength(2);

    const id = created.body.data._id as string;
    expect((await admin.patch(`/users/${id}`, { isActive: false })).body.data.isActive).toBe(false);
    expect((await admin.delete(`/users/${id}`)).status).toBe(204);
  });

  it('forbids the accountant from managing users and the admin from deleting themselves', async () => {
    const admin = await registerTenant(app);
    await admin.post('/users', { name: 'Mona', email: 'mona@example.com', password: 'secret123', roleId: await accountantRoleId(admin) });

    const login = await request(app).post('/api/v1/auth/login').send({ email: 'mona@example.com', password: 'secret123' });
    expect(login.status).toBe(200);
    const res = await request(app).get('/api/v1/users').set('Authorization', `Bearer ${login.body.data.accessToken}`);
    expect(res.status).toBe(403);

    const me = (await admin.get('/auth/me')).body.data.id as string;
    expect((await admin.delete(`/users/${me}`)).status).toBe(400);
  });
});
