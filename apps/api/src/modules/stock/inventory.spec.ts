import { describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import { createId, registerTenant, type TestClient } from '../../test/api-client.js';
import { useTestDatabase } from '../../test/db.js';

useTestDatabase();
const app = createApp();

async function defaultWarehouseId(c: TestClient): Promise<string> {
  const res = await c.get('/warehouses');
  return res.body.data.find((w: { isDefault: boolean }) => w.isDefault)._id as string;
}

const pen = { type: 'stock', sku: 'pen-1', name: 'Blue pen', salePrice: 500, avgCost: 300, reorderLevel: 5 };

describe('inventory', () => {
  it('creates a default warehouse on registration', async () => {
    const c = await registerTenant(app);
    const res = await c.get('/warehouses');
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toMatchObject({ name: 'Main warehouse', isDefault: true, isActive: true });
  });

  it('manages products with unique SKUs and reports quantities', async () => {
    const c = await registerTenant(app);
    const id = await createId(c, '/products', pen);
    expect((await c.post('/products', { ...pen, name: 'Other' })).status).toBe(409);

    const list = await c.get('/products?search=blue');
    expect(list.body.data[0]).toMatchObject({ sku: 'PEN-1', quantity: 0 });

    expect((await c.patch(`/products/${id}`, { reorderLevel: null })).body.data.reorderLevel).toBeUndefined();
    expect((await c.delete(`/products/${id}`)).status).toBe(204);
    // SKU can be reused after delete
    await createId(c, '/products', pen);
  });

  it('adjusts and transfers stock without going negative', async () => {
    const c = await registerTenant(app);
    const productId = await createId(c, '/products', pen);
    const main = await defaultWarehouseId(c);
    const branch = await createId(c, '/warehouses', { name: 'Branch' });

    expect((await c.post('/stock/adjustments', { productId, warehouseId: main, quantity: 10, reason: 'Opening stock' })).status).toBe(204);
    const short = await c.post('/stock/adjustments', { productId, warehouseId: main, quantity: -11, reason: 'Damaged' });
    expect(short.status).toBe(409);
    expect(short.body.error.code).toBe('INSUFFICIENT_STOCK');

    expect((await c.post('/stock/transfers', { productId, fromWarehouseId: main, toWarehouseId: branch, quantity: 4 })).status).toBe(204);
    expect((await c.post('/stock/transfers', { productId, fromWarehouseId: main, toWarehouseId: main, quantity: 1 })).status).toBe(400);

    const levels = await c.get(`/stock/levels?productId=${productId}&sort=warehouseName`);
    expect(levels.body.data.map((l: { warehouseName: string; quantity: number }) => [l.warehouseName, l.quantity])).toEqual([
      ['Branch', 4],
      ['Main warehouse', 6],
    ]);
    expect(levels.body.data[0].value).toBe(1200);

    const movements = await c.get(`/stock/movements?productId=${productId}`);
    expect(movements.body.meta.total).toBe(3);
    expect(movements.body.data[0]).toMatchObject({ productName: 'Blue pen' });

    expect((await c.get('/products')).body.data[0].quantity).toBe(10);
    expect((await c.delete(`/products/${productId}`)).status).toBe(409);
    expect((await c.delete(`/warehouses/${branch}`)).status).toBe(409);
    expect((await c.delete(`/warehouses/${main}`)).status).toBe(409);
  });

  it('sends one low stock alert per product and re-arms it after restock', async () => {
    const c = await registerTenant(app);
    const productId = await createId(c, '/products', pen);
    const main = await defaultWarehouseId(c);
    const lowStockCount = async () =>
      (await c.get('/notifications?type=lowStock')).body.meta.total as number;

    await c.post('/stock/adjustments', { productId, warehouseId: main, quantity: 3, reason: 'Opening' });
    await c.post('/stock/adjustments', { productId, warehouseId: main, quantity: 1, reason: 'Found one' });
    expect(await lowStockCount()).toBe(1);

    await c.post('/stock/adjustments', { productId, warehouseId: main, quantity: 10, reason: 'Restock' });
    await c.post('/stock/adjustments', { productId, warehouseId: main, quantity: -12, reason: 'Sold offline' });
    expect(await lowStockCount()).toBe(2);
  });

  it('keeps exactly one default warehouse', async () => {
    const c = await registerTenant(app);
    const main = await defaultWarehouseId(c);
    const branch = await createId(c, '/warehouses', { name: 'Branch', isDefault: true });
    expect(await defaultWarehouseId(c)).toBe(branch);
    expect((await c.patch(`/warehouses/${branch}`, { isActive: false })).status).toBe(409);
    expect((await c.delete(`/warehouses/${main}`)).status).toBe(204);
  });
});
