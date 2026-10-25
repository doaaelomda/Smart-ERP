import { describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import { createId, registerTenant, type TestClient } from '../../test/api-client.js';
import { useTestDatabase } from '../../test/db.js';

useTestDatabase();
const app = createApp();
const year = new Date().getFullYear();

async function setup(c: TestClient) {
  const supplierId = await createId(c, '/suppliers', { name: 'Delta Supplies' });
  const productId = await createId(c, '/products', { type: 'stock', sku: 'P1', name: 'Paper A4', salePrice: 10000, avgCost: 6000 });
  const serviceId = await createId(c, '/products', { type: 'service', sku: 'S1', name: 'Install', salePrice: 1000 });
  const warehouseId = (await c.get('/warehouses')).body.data[0]._id as string;
  return { supplierId, productId, serviceId, warehouseId };
}

describe('suppliers & purchase orders', () => {
  it('only accepts stock products on purchase orders', async () => {
    const c = await registerTenant(app);
    const { supplierId, serviceId, warehouseId } = await setup(c);
    const res = await c.post('/purchase-orders', { supplierId, warehouseId, lines: [{ productId: serviceId, quantity: 1, unitPrice: 100 }] });
    expect(res.status).toBe(400);
    expect(res.body.error.details[0].path).toBe('lines.0.productId');
  });

  it('receives goods in parts: stock, weighted average cost, status and supplier balance', async () => {
    const c = await registerTenant(app);
    const { supplierId, productId, warehouseId } = await setup(c);
    await c.post('/stock/adjustments', { productId, warehouseId, quantity: 10, reason: 'Opening' }); // 10 @ 60.00

    const created = await c.post('/purchase-orders', {
      supplierId,
      warehouseId,
      expectedDate: '2020-01-01',
      lines: [{ productId, quantity: 10, unitPrice: 9000 }],
    });
    expect(created.body.data).toMatchObject({ number: `PO-${year}-0001`, status: 'draft', total: 102600, warehouseName: 'Main warehouse' });
    const id = created.body.data._id as string;

    expect((await c.post(`/purchase-orders/${id}/receive`, { lines: [{ index: 0, quantity: 1 }] })).status).toBe(409);
    expect((await c.post(`/purchase-orders/${id}/send`)).body.data.actions).toMatchObject({ receive: true, cancel: true, edit: false });
    expect((await c.get('/purchase-orders?late=true')).body.data[0].isLate).toBe(true);

    const partial = await c.post(`/purchase-orders/${id}/receive`, { lines: [{ index: 0, quantity: 5 }] });
    expect(partial.body.data).toMatchObject({ status: 'partially_received', actions: { cancel: false } });
    expect(partial.body.data.lines[0].receivedQty).toBe(5);

    const product = (await c.get(`/products/${productId}`)).body.data;
    // (10 × 6000 + 5 × 9000) / 15 = 7000
    expect(product).toMatchObject({ avgCost: 7000, quantity: 15 });
    expect((await c.get(`/suppliers/${supplierId}`)).body.data.balance).toBe(51300);

    expect((await c.post(`/purchase-orders/${id}/receive`, { lines: [{ index: 0, quantity: 6 }] })).status).toBe(400);
    const done = await c.post(`/purchase-orders/${id}/receive`, { lines: [{ index: 0, quantity: 5 }] });
    expect(done.body.data).toMatchObject({ status: 'received', actions: { receive: false } });
    expect((await c.get(`/suppliers/${supplierId}`)).body.data.balance).toBe(102600);
    expect((await c.delete(`/suppliers/${supplierId}`)).status).toBe(409);
  });

  it('cancels draft or sent orders only', async () => {
    const c = await registerTenant(app);
    const { supplierId, productId, warehouseId } = await setup(c);
    const id = await createId(c, '/purchase-orders', { supplierId, warehouseId, lines: [{ productId, quantity: 2, unitPrice: 100 }] });
    expect((await c.post(`/purchase-orders/${id}/cancel`)).body.data.status).toBe('cancelled');
    expect((await c.post(`/purchase-orders/${id}/send`)).status).toBe(409);
    expect((await c.delete(`/purchase-orders/${id}`)).status).toBe(409);
  });
});
