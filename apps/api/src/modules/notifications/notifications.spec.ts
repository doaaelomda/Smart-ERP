import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import { useTestDatabase } from '../../test/db.js';
import { UserModel } from '../users/user.model.js';
import { notify } from './notification.service.js';

useTestDatabase();
const app = createApp();

async function register(email: string, companyName: string) {
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({ companyName, name: 'Owner', email, password: 'secret123', language: 'en' });
  expect(res.status).toBe(201);
  return { token: `Bearer ${res.body.data.accessToken as string}`, tenantId: res.body.data.user.tenant.id as string };
}

describe('/notifications', () => {
  it('creates a welcome notification on registration and lists it with the unread count', async () => {
    const { token } = await register('a@example.com', 'A Co');
    const res = await request(app).get('/api/v1/notifications').set('Authorization', token);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toMatchObject({ type: 'system', messageKey: 'notifications.welcome', readAt: null });
    expect(res.body.meta.unreadCount).toBe(1);
  });

  it('marks one / all as read and deletes', async () => {
    const { token, tenantId } = await register('a@example.com', 'A Co');
    await notify({ tenantId, permission: 'stock.view', type: 'lowStock', messageKey: 'notifications.lowStock', params: { product: 'Pen', qty: 2 } });

    const list = await request(app).get('/api/v1/notifications').set('Authorization', token);
    expect(list.body.meta.unreadCount).toBe(2);
    const [first, second] = list.body.data as { _id: string }[];

    expect((await request(app).patch(`/api/v1/notifications/${first!._id}/read`).set('Authorization', token)).status).toBe(204);
    expect((await request(app).get('/api/v1/notifications/unread-count').set('Authorization', token)).body.data.count).toBe(1);

    await request(app).patch('/api/v1/notifications/read-all').set('Authorization', token);
    expect((await request(app).get('/api/v1/notifications/unread-count').set('Authorization', token)).body.data.count).toBe(0);

    expect((await request(app).delete(`/api/v1/notifications/${second!._id}`).set('Authorization', token)).status).toBe(204);
    expect((await request(app).get('/api/v1/notifications').set('Authorization', token)).body.meta.total).toBe(1);
  });

  it('deduplicates by dedupeKey and isolates users across tenants', async () => {
    const a = await register('a@example.com', 'A Co');
    const b = await register('b@example.com', 'B Co');
    const alert = { tenantId: a.tenantId, permission: 'stock.view' as const, type: 'lowStock' as const, messageKey: 'notifications.lowStock', dedupeKey: 'lowStock:p1' };

    expect(await notify(alert)).toBe(1);
    expect(await notify(alert)).toBe(0);

    const bList = await request(app).get('/api/v1/notifications').set('Authorization', b.token);
    expect(bList.body.meta.total).toBe(1); // only B's own welcome

    const aFirstId = (await request(app).get('/api/v1/notifications').set('Authorization', a.token)).body.data[0]._id as string;
    expect((await request(app).patch(`/api/v1/notifications/${aFirstId}/read`).set('Authorization', b.token)).status).toBe(404);
  });

  it('skips inactive users when notifying by permission', async () => {
    const { tenantId } = await register('a@example.com', 'A Co');
    await UserModel.updateMany({}, { isActive: false }).setOptions({ skipTenant: true });
    expect(await notify({ tenantId, permission: 'stock.view', type: 'system', messageKey: 'x' })).toBe(0);
  });
});
