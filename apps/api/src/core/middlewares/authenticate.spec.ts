import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import { RoleModel } from '../../modules/roles/role.model.js';
import { useTestDatabase } from '../../test/db.js';
import { authenticate } from './authenticate.js';
import { errorHandler } from './error-handler.js';
import { requirePermission } from './require-permission.js';
import { loginAdmin } from '../../test/api-client.js';

useTestDatabase();

// Test-only routes: a tenant-scoped query and a permission-protected endpoint.
const probe = express();
probe.get('/roles', authenticate, async (_req, res) => {
  await new Promise((r) => setTimeout(r, 5)); // context must survive async hops
  res.json(await RoleModel.find().lean());
});
probe.get('/suppliers', authenticate, requirePermission('suppliers.delete'), (_req, res) => res.json({ ok: true }));
probe.get('/reports', authenticate, requirePermission('reports.view'), (_req, res) => res.json({ ok: true }));
probe.use(errorHandler);

async function tokenFor(email: string, company: string): Promise<string> {
  const res = await loginAdmin(createApp(), email, company);
  return res.body.data.accessToken as string;
}

describe('authenticate + tenant context', () => {
  it('scopes queries to the token tenant', async () => {
    const a = await tokenFor('a@example.com', 'A Co');
    await tokenFor('b@example.com', 'B Co');

    const res = await request(probe).get('/roles').set('Authorization', `Bearer ${a}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(new Set(res.body.map((r: { tenantId: string }) => r.tenantId)).size).toBe(1);
  });
});

describe('requirePermission', () => {
  it('allows owners and forbids roles without the permission', async () => {
    const token = await tokenFor('owner@example.com', 'Owner Co');
    expect((await request(probe).get('/reports').set('Authorization', `Bearer ${token}`)).status).toBe(200);

    // Downgrade the owner role to Sales permissions.
    await RoleModel.updateMany({ name: 'SuperAdmin' }, { permissions: ['dashboard.view'] }).setOptions({ skipTenant: true });
    const res = await request(probe).get('/suppliers').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });
});
