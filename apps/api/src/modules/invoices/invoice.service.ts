import { Types, type ClientSession } from 'mongoose';
import type { InvoiceActions, InvoiceStatus, Permission } from '@erp/shared';
import { currentUserId } from '../../core/context/current-user.js';
import { AppError } from '../../core/errors/app-error.js';
import { buildPaginationMeta, parseListQuery } from '../../core/utils/list-query.js';
import { withTransaction } from '../../core/utils/transaction.js';
import { nextDocumentNumber } from '../counters/counter.model.js';
import { changeCustomerBalance, getActiveCustomerName } from '../customers/customer.service.js';
import { buildDocumentLines, type BuiltLine } from '../documents/document-lines.js';
import { ProductModel } from '../products/product.model.js';
import { applyStockChanges, checkLowStock, type StockChange } from '../stock/stock.service.js';
import { WarehouseModel } from '../warehouses/warehouse.model.js';
import { assertActiveWarehouse, getDefaultWarehouseId } from '../warehouses/warehouse.service.js';
import { InvoiceModel } from './invoice.model.js';
import type { CancelInvoiceBody, InvoiceBody, UpdateInvoiceBody } from './invoice.validation.js';

const LIST_OPTIONS = {
  sortable: ['number', 'customerName', 'issueDate', 'dueDate', 'total', 'status', 'createdAt'],
  searchable: ['number', 'customerName'],
  filterable: ['status', 'customerId'],
  defaultSort: '-createdAt',
} as const;

const notDeleted = { isDeleted: false };
const OPEN_STATUSES: InvoiceStatus[] = ['issued', 'partially_paid'];

type InvoiceDoc = { status: string; paidAmount: number; total: number };

/** What the user may do now. Mirrors the checks in the service functions below. */
export function invoiceActions(invoice: InvoiceDoc, permissions: Set<Permission>): InvoiceActions {
  const isDraft = invoice.status === 'draft';
  return {
    edit: isDraft && permissions.has('invoices.update'),
    delete: isDraft && permissions.has('invoices.update'),
    issue: isDraft && permissions.has('invoices.issue'),
    cancel: invoice.status === 'issued' && invoice.paidAmount === 0 && permissions.has('invoices.cancel'),
    pay: OPEN_STATUSES.includes(invoice.status as InvoiceStatus) && invoice.paidAmount < invoice.total && permissions.has('payments.create'),
  };
}

async function resolveWarehouse(lines: BuiltLine[], warehouseId: string | undefined, session?: ClientSession) {
  if (!lines.some((l) => l.productType === 'stock')) return warehouseId ? { warehouseId } : {};
  const id = warehouseId ?? (await getDefaultWarehouseId(session));
  await assertActiveWarehouse(id, session);
  return { warehouseId: id };
}

export async function listInvoices(rawQuery: Record<string, unknown>) {
  const { filter, sort, skip, limit, page } = parseListQuery(rawQuery, LIST_OPTIONS);
  // open = can still receive payments
  if (rawQuery['open'] === 'true') filter['status'] = { $in: OPEN_STATUSES };
  if (rawQuery['overdue'] === 'true') {
    filter['status'] = { $in: OPEN_STATUSES };
    filter['dueDate'] = { $lt: new Date() };
  }
  const where = { ...filter, ...notDeleted };
  const [items, total] = await Promise.all([
    InvoiceModel.find(where).sort(sort).skip(skip).limit(limit).select('-lines').lean(),
    InvoiceModel.countDocuments(where),
  ]);
  return { items, meta: buildPaginationMeta(total, page, limit) };
}

async function findInvoice(id: string, session?: ClientSession) {
  const invoice = await InvoiceModel.findOne({ _id: id, ...notDeleted }).session(session ?? null).lean();
  if (!invoice) throw AppError.notFound('Invoice not found');
  return invoice;
}

export async function getInvoiceById(id: string, permissions: Set<Permission>) {
  const invoice = await findInvoice(id);
  const warehouse = invoice.warehouseId
    ? await WarehouseModel.findById(invoice.warehouseId).select('name').lean()
    : null;
  return { ...invoice, warehouseName: warehouse?.name, actions: invoiceActions(invoice, permissions) };
}

export async function createInvoice(input: InvoiceBody, extra: { quotationId?: string } = {}) {
  const customerName = await getActiveCustomerName(input.customerId);
  const { lines, totals } = await buildDocumentLines(input.lines);
  const warehouse = await resolveWarehouse(lines, input.warehouseId);
  const userId = currentUserId();
  const invoice = await InvoiceModel.create({
    ...input,
    ...warehouse,
    ...extra,
    customerName,
    lines,
    ...totals,
    status: 'draft',
    createdBy: userId,
    updatedBy: userId,
  });
  return invoice.toObject();
}

export async function updateInvoice(id: string, input: UpdateInvoiceBody) {
  const current = await findInvoice(id);
  if (current.status !== 'draft') throw AppError.invalidTransition('Only draft invoices can be edited');

  const $set: Record<string, unknown> = { ...input, updatedBy: currentUserId() };
  if (input.customerId) $set['customerName'] = await getActiveCustomerName(input.customerId);
  if (input.lines) {
    const { lines, totals } = await buildDocumentLines(input.lines);
    Object.assign($set, { lines, ...totals });
    Object.assign($set, await resolveWarehouse(lines, input.warehouseId ?? current.warehouseId?.toString()));
  } else if (input.warehouseId) {
    await assertActiveWarehouse(input.warehouseId);
  }

  const invoice = await InvoiceModel.findOneAndUpdate({ _id: id, status: 'draft', ...notDeleted }, { $set }, {
    returnDocument: 'after',
    runValidators: true,
  }).lean();
  if (!invoice) throw AppError.invalidTransition('Only draft invoices can be edited');
  return invoice;
}

export async function deleteInvoice(id: string) {
  const current = await findInvoice(id);
  if (current.status !== 'draft') throw AppError.invalidTransition('Only draft invoices can be deleted; cancel issued ones');
  await InvoiceModel.updateOne(
    { _id: id, status: 'draft' },
    { $set: { isDeleted: true, deletedAt: new Date(), updatedBy: currentUserId() } },
  );
}

/** Stock lines grouped per product (one ledger row per product). */
function stockQuantities(lines: { productId?: Types.ObjectId | string | null; productType?: string | null; quantity: number }[]) {
  const map = new Map<string, number>();
  for (const line of lines) {
    if (line.productType !== 'stock' || !line.productId) continue;
    const id = line.productId.toString();
    map.set(id, (map.get(id) ?? 0) + line.quantity);
  }
  return map;
}

/** Spec 8.3: stock out + number + customer balance, all-or-nothing. */
export async function issueInvoice(id: string) {
  const result = await withTransaction(async (session) => {
    const invoice = await findInvoice(id, session);
    if (invoice.status !== 'draft') throw AppError.invalidTransition('Only draft invoices can be issued');

    const quantities = stockQuantities(invoice.lines);
    const costs = new Map<string, number>();
    if (quantities.size) {
      if (!invoice.warehouseId) throw AppError.badRequest('Warehouse is required', [{ path: 'warehouseId', message: 'Required' }]);
      await assertActiveWarehouse(invoice.warehouseId.toString(), session);
      const products = await ProductModel.find({ _id: { $in: [...quantities.keys()] } }).session(session).select('avgCost').lean();
      for (const p of products) costs.set(p._id.toString(), p.avgCost);

      const changes: StockChange[] = [...quantities].map(([productId, qty]) => ({
        productId,
        warehouseId: invoice.warehouseId!.toString(),
        quantity: -qty,
        type: 'OUT',
        unitCost: costs.get(productId) ?? 0,
        refType: 'invoice',
        refId: invoice._id,
      }));
      await applyStockChanges(changes, session);
    }

    const number = await nextDocumentNumber('invoice', 'INV', session);
    const lines = invoice.lines.map((l) => ({ ...l, unitCost: l.productId ? (costs.get(l.productId.toString()) ?? l.unitCost) : undefined }));
    const updated = await InvoiceModel.findOneAndUpdate(
      { _id: id, status: 'draft' },
      { $set: { number, status: 'issued', issueDate: new Date(), lines, updatedBy: currentUserId() } },
      { returnDocument: 'after', session },
    ).lean();
    if (!updated) throw AppError.invalidTransition('Only draft invoices can be issued');

    await changeCustomerBalance(invoice.customerId.toString(), invoice.total, session);
    return { invoice: updated, productIds: [...quantities.keys()] };
  });
  await checkLowStock(result.productIds);
  return result.invoice;
}

/** Spec 8.4: only issued invoices without payments; stock comes back, balance goes down. */
export async function cancelInvoice(id: string, input: CancelInvoiceBody) {
  return withTransaction(async (session) => {
    const invoice = await findInvoice(id, session);
    if (invoice.status !== 'issued' || invoice.paidAmount !== 0) {
      throw AppError.invalidTransition('Only issued invoices without payments can be cancelled');
    }

    const quantities = stockQuantities(invoice.lines);
    if (quantities.size && invoice.warehouseId) {
      const unitCost = new Map(invoice.lines.filter((l) => l.productId).map((l) => [l.productId!.toString(), l.unitCost ?? 0]));
      await applyStockChanges(
        [...quantities].map(([productId, qty]) => ({
          productId,
          warehouseId: invoice.warehouseId!.toString(),
          quantity: qty,
          type: 'IN' as const,
          unitCost: unitCost.get(productId) ?? 0,
          refType: 'invoiceCancel' as const,
          refId: invoice._id,
          reason: input.reason,
        })),
        session,
      );
    }

    const updated = await InvoiceModel.findOneAndUpdate(
      { _id: id, status: 'issued', paidAmount: 0 },
      { $set: { status: 'cancelled', cancelledReason: input.reason, cancelledAt: new Date(), updatedBy: currentUserId() } },
      { returnDocument: 'after', session },
    ).lean();
    if (!updated) throw AppError.invalidTransition('Only issued invoices without payments can be cancelled');

    await changeCustomerBalance(invoice.customerId.toString(), -invoice.total, session);
    return updated;
  });
}
