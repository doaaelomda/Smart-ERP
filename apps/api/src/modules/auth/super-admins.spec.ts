import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import { useTestDatabase } from '../../test/db.js';
import { UserModel } from '../users/user.model.js';
import { syncSuperAdmins } from './super-admins.js';

useTestDatabase();

describe('super-admins.json sync', () => {
  it('creates the listed SuperAdmins once and they can log in with the original password', async () => {
    process.env['SUPER_ADMINS'] = JSON.stringify([
      { name: 'Super Admin', email: 'superadmin@email.com', password: 'YourPass123' },
    ]);
    await syncSuperAdmins();
    await syncSuperAdmins();
    expect(await UserModel.countDocuments().setOptions({ skipTenant: true })).toBe(1);

    const res = await request(createApp()).post('/api/v1/auth/login').send({ email: 'superadmin@email.com', password: 'YourPass123' });
    expect(res.status).toBe(200);
    expect(res.body.data.user.role.name).toBe('SuperAdmin');
  });
});

describe('Swagger', () => {
  it('serves the docs page', async () => {
    const res = await request(createApp()).get('/api/docs/');
    expect(res.status).toBe(200);
    expect(res.text).toContain('swagger');
  });
});
