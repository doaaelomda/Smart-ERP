import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { ALL_PERMISSIONS } from '@erp/shared';
import { createApp } from '../../app.js';
import { runWithContext } from '../../core/context/request-context.js';
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

function refreshCookie(res: request.Response): string {
  const cookies = res.headers['set-cookie'] as unknown as string[];
  const cookie = cookies.find((c) => c.startsWith('erp_rt='));
  expect(cookie).toBeDefined();
  expect(cookie).toContain('HttpOnly');
  expect(cookie).toContain('Path=/api/v1/auth');
  return cookie!.split(';')[0]!;
}

async function registerOwner(body = owner) {
  return request(app).post('/api/v1/auth/register').send(body);
}

describe('POST /auth/register', () => {
  it('creates tenant, default roles and owner, and returns a session', async () => {
    const res = await registerOwner();

    expect(res.status).toBe(201);
    expect(res.body.data.accessToken).toEqual(expect.any(String));
    expect(res.body.data.user).toMatchObject({
      name: 'Doaa Elomda',
      email: 'doaa@example.com',
      language: 'en',
      role: { name: 'Owner' },
      tenant: { name: 'Nile Trading', currency: 'EGP', vatRate: 14 },
    });
    expect(res.body.data.user.permissions).toHaveLength(ALL_PERMISSIONS.length);
    refreshCookie(res);

    expect(await TenantModel.countDocuments()).toBe(1);
    expect(await RoleModel.countDocuments().setOptions({ skipTenant: true })).toBe(5);
    const user = await UserModel.findOne().setOptions({ skipTenant: true }).select('+passwordHash').lean();
    expect(user!.passwordHash).not.toBe(owner.password);
  });

  it('rejects a duplicate email (case-insensitive) without creating a second tenant', async () => {
    await registerOwner();
    const res = await registerOwner({ ...owner, email: 'DOAA@example.com', companyName: 'Other' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_TAKEN');
    expect(await TenantModel.countDocuments()).toBe(1);
  });

  it('validates input', async () => {
    const res = await registerOwner({ ...owner, email: 'not-an-email', password: 'short' });
    expect(res.status).toBe(400);
    expect(res.body.error.details.map((d: { path: string }) => d.path)).toEqual(['email', 'password']);
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
    refreshCookie(res);
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

describe('POST /auth/refresh', () => {
  it('rotates the refresh token', async () => {
    const cookie = refreshCookie(await registerOwner());

    const first = await request(app).post('/api/v1/auth/refresh').set('Cookie', cookie);
    expect(first.status).toBe(200);
    expect(first.body.data.accessToken).toEqual(expect.any(String));
    const newCookie = refreshCookie(first);
    expect(newCookie).not.toBe(cookie);

    const second = await request(app).post('/api/v1/auth/refresh').set('Cookie', newCookie);
    expect(second.status).toBe(200);
  });

  it('detects reuse of a rotated token and revokes the whole session family', async () => {
    const cookie = refreshCookie(await registerOwner());
    const rotated = refreshCookie(await request(app).post('/api/v1/auth/refresh').set('Cookie', cookie));

    const reuse = await request(app).post('/api/v1/auth/refresh').set('Cookie', cookie);
    expect(reuse.status).toBe(401);

    // The legitimate (latest) token is revoked too.
    const after = await request(app).post('/api/v1/auth/refresh').set('Cookie', rotated);
    expect(after.status).toBe(401);
  });

  it('returns 401 without a cookie', async () => {
    const res = await request(app).post('/api/v1/auth/refresh');
    expect(res.status).toBe(401);
  });
});

describe('POST /auth/logout', () => {
  it('revokes the refresh token and clears the cookie', async () => {
    const cookie = refreshCookie(await registerOwner());
    const res = await request(app).post('/api/v1/auth/logout').set('Cookie', cookie);
    expect(res.status).toBe(204);
    expect(String(res.headers['set-cookie'])).toContain('erp_rt=;');

    const refresh = await request(app).post('/api/v1/auth/refresh').set('Cookie', cookie);
    expect(refresh.status).toBe(401);
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
    expect(roles).toHaveLength(5);
    expect(roles.every((r) => r.tenantId.toString() === tenants[0]!._id.toString())).toBe(true);

    await expect(RoleModel.find().lean()).rejects.toThrow(/Tenant context is missing/);
  });
});
