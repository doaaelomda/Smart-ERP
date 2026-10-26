import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { ALL_PERMISSIONS } from '@erp/shared';
import { createApp } from '../../app.js';
import { runWithContext } from '../../core/context/request-context.js';
import { loginAdmin } from '../../test/api-client.js';
import { useTestDatabase } from '../../test/db.js';
import { RoleModel } from '../roles/role.model.js';
import { TenantModel } from '../tenants/tenant.model.js';
import { UserModel } from '../users/user.model.js';

useTestDatabase();
const app = createApp();

const owner = {
  companyName: 'Nile Trading',
  name: 'Doaa Elomda',
  email: 'Doaa@Example.com',
  password: 'secret123',
  language: 'en',
};

async function registerOwner(body = owner) {
  return loginAdmin(app, body.email, body.companyName, body.name);
}

describe('admin account setup', () => {
  it('creates tenant, default roles and owner, and returns a session', async () => {
    const res = await registerOwner();

    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toEqual(expect.any(String));
    expect(res.body.data.user).toMatchObject({
      name: 'Doaa Elomda',
      email: 'doaa@example.com',
      language: 'en',
      role: { name: 'SuperAdmin' },
      tenant: { name: 'Nile Trading', currency: 'EGP', vatRate: 14 },
    });
    expect(res.body.data.user.permissions).toHaveLength(ALL_PERMISSIONS.length);

    expect(await TenantModel.countDocuments()).toBe(1);
    expect(await RoleModel.countDocuments().setOptions({ skipTenant: true })).toBe(2);
    const user = await UserModel.findOne().setOptions({ skipTenant: true }).select('+passwordHash').lean();
    expect(user!.passwordHash).not.toBe(owner.password);
  });

});

describe('POST /auth/login', () => {
  it('logs in with valid credentials', async () => {
    await registerOwner();
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'doaa@example.com', password: owner.password });

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe('doaa@example.com');
  });

  it('returns the same error for wrong password and unknown email', async () => {
    await registerOwner();
    const wrong = await request(app).post('/api/v1/auth/login').send({ email: owner.email, password: 'wrong1234' });
    const unknown = await request(app).post('/api/v1/auth/login').send({ email: 'x@y.com', password: 'wrong1234' });

    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body.error.code).toBe('INVALID_CREDENTIALS');
    expect(unknown.body.error).toEqual(wrong.body.error);
  });

  it('blocks suspended companies', async () => {
    await registerOwner();
    await TenantModel.updateMany({}, { status: 'suspended' });
    const res = await request(app).post('/api/v1/auth/login').send({ email: owner.email, password: owner.password });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('TENANT_SUSPENDED');
  });
});

describe('GET /auth/me', () => {
  it('returns the current user with a valid token', async () => {
    const { body } = await registerOwner();
    const res = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${body.data.accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe('doaa@example.com');
  });

  it('rejects missing or invalid tokens', async () => {
    expect((await request(app).get('/api/v1/auth/me')).status).toBe(401);
    const res = await request(app).get('/api/v1/auth/me').set('Authorization', 'Bearer nope');
    expect(res.status).toBe(401);
  });

  it('rejects tokens of a disabled user immediately', async () => {
    const { body } = await registerOwner();
    await UserModel.updateMany({}, { isActive: false }).setOptions({ skipTenant: true });
    const res = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${body.data.accessToken}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ACCOUNT_DISABLED');
  });
});

describe('tenant isolation', () => {
  it('scopes queries to the current tenant and refuses queries without a tenant', async () => {
    await registerOwner();
    await registerOwner({ ...owner, email: 'other@example.com', companyName: 'Other Co' });
    const tenants = await TenantModel.find().lean();

    // Queries are lazy: they must execute (await) inside the context.
    const roles = await runWithContext({ tenantId: tenants[0]!._id.toString(), userId: 'x' }, async () =>
      await RoleModel.find().lean(),
    );
    expect(roles).toHaveLength(2);
    expect(roles.every((r) => r.tenantId.toString() === tenants[0]!._id.toString())).toBe(true);

    await expect(RoleModel.find().lean()).rejects.toThrow(/Tenant context is missing/);
  });
});
