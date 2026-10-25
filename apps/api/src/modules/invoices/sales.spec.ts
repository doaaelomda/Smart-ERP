import { describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import { createId, registerTenant, type TestClient } from '../../test/api-client.js';
import { useTestDatabase } from '../../test/db.js';

useTestDatabase();
const app = createApp();
const year = new Date().getFullYear();

async function setup(c: TestClient, stock = 0) {
  const customerId = await createId(c, '/customers', { name: 'Delta Co' });
  const productId = await createId(c, '/products', { type: 'stock', sku: 'P1', name: 'Paper A4', salePrice: 10000, avgCost: 7000 });
  const warehouseId = (await c.get('/warehouses')).body.data[0]._id as string;
  if (stock) await c.post('/stock/adjustments', { productId, warehouseId, quantity: stock, reason: 'Opening' });
  return { customerId, productId, warehouseId };
}

const invoiceBody = (customerId: string, productId: string) => ({
  customerId,
  dueDate: '2030-01-31',
  lines: [
    { productId, description: '', quantity: 3, unitPrice: 10000, discount: 1000 },
    { description: 'Delivery', quantity: 1, unitPrice: 5000, vatApplicable: false },
  ],
});

describe('invoices & payments', () => {
  it('calculates totals on the server and returns allowed actions', async () => {
    const c = await registerTenant(app);
    const { customerId, productId } = await setup(c);
    const res = await c.post('/invoices', invoiceBody(customerId, productId));

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      status: 'draft',
      customerName: 'Delta Co',
      warehouseName: 'Main warehouse',
      // 30000 − 1000 = 29000 (+14% = 4060) ; 5000 no VAT
      subtotal: 35000,
      discountTotal: 1000,
      vatTotal: 4060,
      total: 38060,
      actions: { edit: true, delete: true, issue: true, cancel: false, pay: false },
    });
    expect(res.body.data.lines[0]).toMatchObject({ description: 'Paper A4', productType: 'stock', vatRate: 14 });
    expect(res.body.data.number).toBeUndefined();
  });

  it('refuses to issue without enough stock and keeps the draft', async () => {
    const c = await registerTenant(app);
    const { customerId, productId } = await setup(c, 2);
    const id = await createId(c, '/invoices', invoiceBody(customerId, productId));

    const res = await c.post(`/invoices/${id}/issue`);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('INSUFFICIENT_STOCK');
    expect((await c.get(`/invoices/${id}`)).body.data.status).toBe('draft');
    expect((await c.get('/products')).body.data[0].quantity).toBe(2);
  });

  it('issues, takes payments and blocks invalid transitions', async () => {
    const c = await registerTenant(app);
    const { customerId, productId } = await setup(c, 10);
    const id = await createId(c, '/invoices', invoiceBody(customerId, productId));

    const issued = await c.post(`/invoices/${id}/issue`);
    expect(issued.status).toBe(200);
    expect(issued.body.data).toMatchObject({ number: `INV-${year}-0001`, status: 'issued', actions: { edit: false, cancel: true, pay: true } });
    expect(issued.body.data.lines[0].unitCost).toBe(7000);
    expect((await c.get('/products')).body.data[0].quantity).toBe(7);
    expect((await c.get(`/customers/${customerId}`)).body.data.balance).toBe(38060);

    expect((await c.patch(`/invoices/${id}`, { notes: 'x' })).status).toBe(409);
    expect((await c.post(`/invoices/${id}/issue`)).body.error.code).toBe('INVALID_STATUS_TRANSITION');

    const over = await c.post('/payments', { invoiceId: id, amount: 38061, method: 'cash' });
    expect(over.status).toBe(400);

    const partial = await c.post('/payments', { invoiceId: id, amount: 8060, method: 'cash' });
    expect(partial.status).toBe(201);
    expect(partial.body.data).toMatchObject({ number: `PAY-${year}-0001`, invoiceNumber: `INV-${year}-0001`, customerName: 'Delta Co' });

    let invoice = (await c.get(`/invoices/${id}`)).body.data;
    expect(invoice).toMatchObject({ status: 'partially_paid', paidAmount: 8060, actions: { cancel: false, pay: true } });
    expect((await c.post(`/invoices/${id}/cancel`, { reason: 'Customer returned' })).status).toBe(409);

    await c.post('/payments', { invoiceId: id, amount: 30000, method: 'bank_transfer', reference: 'TRX-1' });
    invoice = (await c.get(`/invoices/${id}`)).body.data;
    expect(invoice).toMatchObject({ status: 'paid', paidAmount: 38060, actions: { pay: false } });
    expect((await c.get(`/customers/${customerId}`)).body.data.balance).toBe(0);
    expect((await c.get(`/payments?invoiceId=${id}`)).body.meta.total).toBe(2);
  });

  it('cancels an unpaid invoice: stock and balance come back', async () => {
    const c = await registerTenant(app);
    const { customerId, productId } = await setup(c, 5);
    const id = await createId(c, '/invoices', invoiceBody(customerId, productId));
    await c.post(`/invoices/${id}/issue`);

    const res = await c.post(`/invoices/${id}/cancel`, { reason: 'Wrong customer' });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ status: 'cancelled', cancelledReason: 'Wrong customer' });
    expect((await c.get('/products')).body.data[0].quantity).toBe(5);
    expect((await c.get(`/customers/${customerId}`)).body.data.balance).toBe(0);
    expect((await c.get(`/stock/movements?refType=invoiceCancel`)).body.meta.total).toBe(1);
  });

  it('lists overdue invoices and deletes only drafts', async () => {
    const c = await registerTenant(app);
    const { customerId } = await setup(c);
    const service = { customerId, dueDate: '2020-01-01', lines: [{ description: 'Consulting', quantity: 1, unitPrice: 1000 }] };
    const overdueId = await createId(c, '/invoices', service);
    await c.post(`/invoices/${overdueId}/issue`);
    const draftId = await createId(c, '/invoices', service);

    expect((await c.get('/invoices?overdue=true')).body.data.map((i: { _id: string }) => i._id)).toEqual([overdueId]);
    expect((await c.delete(`/invoices/${overdueId}`)).status).toBe(409);
    expect((await c.delete(`/invoices/${draftId}`)).status).toBe(204);
    expect((await c.get('/invoices')).body.meta.total).toBe(1);
  });
});

describe('quotations', () => {
  it('goes draft → sent → accepted → converted into a draft invoice', async () => {
    const c = await registerTenant(app);
    const { customerId, productId } = await setup(c);
    const created = await c.post('/quotations', { ...invoiceBody(customerId, productId), dueDate: undefined, validUntil: '2030-01-01' });
    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({ number: `QUO-${year}-0001`, total: 38060, actions: { send: true, accept: false } });
    const id = created.body.data._id as string;

    expect((await c.post(`/quotations/${id}/accept`)).status).toBe(409);
    await c.post(`/quotations/${id}/send`);
    expect((await c.patch(`/quotations/${id}`, { notes: 'x' })).status).toBe(409);
    expect((await c.post(`/quotations/${id}/accept`)).body.data.actions).toMatchObject({ convert: true });

    const converted = await c.post(`/quotations/${id}/convert`, {});
    expect(converted.status).toBe(201);
    const invoice = (await c.get(`/invoices/${converted.body.data.invoiceId}`)).body.data;
    expect(invoice).toMatchObject({ status: 'draft', total: 38060, quotationId: id });

    expect((await c.get(`/quotations/${id}`)).body.data).toMatchObject({ status: 'converted', invoiceId: invoice._id });
    expect((await c.post(`/quotations/${id}/convert`, {})).status).toBe(409);
  });

  it('marks sent quotations past validUntil as expired and blocks accepting them', async () => {
    const c = await registerTenant(app);
    const { customerId } = await setup(c);
    const id = await createId(c, '/quotations', {
      customerId,
      validUntil: '2020-01-01',
      lines: [{ description: 'Consulting', quantity: 1, unitPrice: 1000 }],
    });
    await c.post(`/quotations/${id}/send`);
    expect((await c.get('/quotations')).body.data[0].isExpired).toBe(true);
    expect((await c.post(`/quotations/${id}/accept`)).status).toBe(409);
    expect((await c.post(`/quotations/${id}/reject`)).body.data.status).toBe('rejected');
  });
});
