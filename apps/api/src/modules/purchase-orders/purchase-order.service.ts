import { Types } from 'mongoose';
import type { ApiErrorDetail, Permission, PurchaseOrderActions, PurchaseOrderStatus } from '@erp/shared';
import { currentUserId } from '../../core/context/current-user.js';
import { AppError } from '../../core/errors/app-error.js';
import { buildPaginationMeta, parseListQuery } from '../../core/utils/list-query.js';
import { withTransaction } from '../../core/utils/transaction.js';
import { nextDocumentNumber } from '../counters/counter.model.js';
import { buildDocumentLines } from '../documents/document-lines.js';
import { ProductModel } from '../products/product.model.js';
import { StockLevelModel } from '../stock/stock-level.model.js';
import { applyStockChanges, checkLowStock } from '../stock/stock.service.js';
import { changeSupplierBalance, getActiveSupplierName } from '../suppliers/supplier.service.js';
import { WarehouseModel } from '../warehouses/warehouse.model.js';
import { assertActiveWarehouse } from '../warehouses/warehouse.service.js';
import { PurchaseOrderModel } from './purchase-order.model.js';
import type { PurchaseOrderBody, ReceivePurchaseOrderBody, UpdatePurchaseOrderBody } from './purchase-order.validation.js';

const LIST_OPTIONS = {
  sortable: ['number', 'supplierName', 'orderDate', 'expectedDate', 'total', 'status', 'createdAt'],
  searchable: ['number', 'supplierName'],
  filterable: ['status', 'supplierId', 'warehouseId'],
  defaultSort: '-createdAt',
} as const;

const notDeleted = { isDeleted: false };
const RECEIVABLE: PurchaseOrderStatus[] = ['sent', 'partially_received'];

type PoDoc = { status: string; expectedDate?: Date | null; lines: { receivedQty: number }[] };

const isLate = (po: PoDoc) =>
  RECEIVABLE.includes(po.status as PurchaseOrderStatus) && !!po.expectedDate && po.expectedDate.getTime() < Date.now();

export function purchaseOrderActions(po: PoDoc, permissions: Set<Permission>): PurchaseOrderActions {
  const status = po.status as PurchaseOrderStatus;
  const nothingReceived = po.lines.every((l) => l.receivedQty === 0);
  return {
    edit: status === 'draft' && permissions.has('purchaseOrders.update'),
    delete: status === 'draft' && permissions.has('purchaseOrders.update'),
    send: status === 'draft' && permissions.has('purchaseOrders.update'),
    receive: RECEIVABLE.includes(status) && permissions.has('purchaseOrders.receive'),
    cancel: (status === 'draft' || status === 'sent') && nothingReceived && permissions.has('purchaseOrders.cancel'),
  };
}

export async function listPurchaseOrders(rawQuery: Record<string, unknown>) {
  const { filter, sort, skip, limit, page } = parseListQuery(rawQuery, LIST_OPTIONS);
  if (rawQuery['late'] === 'true') {
    filter['status'] = { $in: RECEIVABLE };
    filter['expectedDate'] = { $lt: new Date() };
  }
  const where = { ...filter, ...notDeleted };
  const [items, total] = await Promise.all([
    PurchaseOrderModel.find(where).sort(sort).skip(skip).limit(limit).lean(),
    PurchaseOrderModel.countDocuments(where),
  ]);
  return {
    items: items.map(({ lines, ...po }) => ({ ...po, isLate: isLate({ ...po, lines }) })),
    meta: buildPaginationMeta(total, page, limit),
  };
}

async function findPurchaseOrder(id: string) {
  const po = await PurchaseOrderModel.findOne({ _id: id, ...notDeleted }).lean();
  if (!po) throw AppError.notFound('Purchase order not found');
  return po;
}

export async function getPurchaseOrderById(id: string, permissions: Set<Permission>) {
  const po = await findPurchaseOrder(id);
  const warehouse = await WarehouseModel.findById(po.warehouseId).select('name').lean();
  return { ...po, warehouseName: warehouse?.name ?? '—', isLate: isLate(po), actions: purchaseOrderActions(po, permissions) };
}

export async function createPurchaseOrder(input: PurchaseOrderBody) {
  const supplierName = await getActiveSupplierName(input.supplierId);
  await assertActiveWarehouse(input.warehouseId);
  const { lines, totals } = await buildDocumentLines(input.lines, { requireStockProducts: true });
  const userId = currentUserId();
  const po = await PurchaseOrderModel.create({
    ...input,
    orderDate: input.orderDate ?? new Date(),
    number: await nextDocumentNumber('purchaseOrder', 'PO'),
    supplierName,
    lines: lines.map((l) => ({ ...l, receivedQty: 0 })),
    ...totals,
    createdBy: userId,
    updatedBy: userId,
  });
  return po.toObject();
}

export async function updatePurchaseOrder(id: string, input: UpdatePurchaseOrderBody) {
  const current = await findPurchaseOrder(id);
  if (current.status !== 'draft') throw AppError.invalidTransition('Only draft purchase orders can be edited');
  const $set: Record<string, unknown> = { ...input, updatedBy: currentUserId() };
  if (input.supplierId) $set['supplierName'] = await getActiveSupplierName(input.supplierId);
  if (input.warehouseId) await assertActiveWarehouse(input.warehouseId);
  if (input.lines) {
    const { lines, totals } = await buildDocumentLines(input.lines, { requireStockProducts: true });
    Object.assign($set, { lines: lines.map((l) => ({ ...l, receivedQty: 0 })), ...totals });
  }
  const updated = await PurchaseOrderModel.findOneAndUpdate({ _id: id, status: 'draft' }, { $set }, {
    returnDocument: 'after',
    runValidators: true,
  }).lean();
  if (!updated) throw AppError.invalidTransition('Only draft purchase orders can be edited');
  return updated;
}

export async function deletePurchaseOrder(id: string) {
  const current = await findPurchaseOrder(id);
  if (current.status !== 'draft') throw AppError.invalidTransition('Only draft purchase orders can be deleted');
  await PurchaseOrderModel.updateOne({ _id: id, status: 'draft' }, { $set: { isDeleted: true, deletedAt: new Date() } });
}

export async function sendPurchaseOrder(id: string) {
  const updated = await PurchaseOrderModel.findOneAndUpdate(
    { _id: id, ...notDeleted, status: 'draft' },
    { $set: { status: 'sent', updatedBy: currentUserId() } },
    { returnDocument: 'after' },
  ).lean();
  if (!updated) {
    await findPurchaseOrder(id);
    throw AppError.invalidTransition('Only draft purchase orders can be sent');
  }
  return updated;
}

/** draft | sent with nothing received → cancelled. */
export async function cancelPurchaseOrder(id: string) {
  const updated = await PurchaseOrderModel.findOneAndUpdate(
    { _id: id, ...notDeleted, status: { $in: ['draft', 'sent'] }, 'lines.receivedQty': { $not: { $gt: 0 } } },
    { $set: { status: 'cancelled', updatedBy: currentUserId() } },
    { returnDocument: 'after' },
  ).lean();
  if (!updated) {
    await findPurchaseOrder(id);
    throw AppError.invalidTransition('Only draft or sent purchase orders with nothing received can be cancelled');
  }
  return updated;
}

const round3 = (n: number) => Math.round(n * 1000) / 1000;

/**
 * Goods receipt (spec 8.4): per line, in one transaction — weighted average cost,
 * stock IN, receivedQty, PO status and the supplier payable.
 */
export async function receivePurchaseOrder(id: string, input: ReceivePurchaseOrderBody) {
  const productIds = await withTransaction(async (session) => {
    const po = await PurchaseOrderModel.findOne({ _id: id, ...notDeleted }).session(session).lean();
    if (!po) throw AppError.notFound('Purchase order not found');
    if (!RECEIVABLE.includes(po.status as PurchaseOrderStatus)) {
      throw AppError.invalidTransition('Send the purchase order before receiving goods');
    }
    await assertActiveWarehouse(po.warehouseId.toString(), session);

    const errors: ApiErrorDetail[] = [];
    for (const r of input.lines) {
      const line = po.lines[r.index];
      if (!line) errors.push({ path: `lines.${r.index}`, message: 'Line not found' });
      else if (r.quantity > round3(line.quantity - line.receivedQty) + 1e-9) {
        errors.push({ path: `lines.${r.index}.quantity`, message: `max:${round3(line.quantity - line.receivedQty)}` });
      }
    }
    if (errors.length) throw AppError.badRequest('Validation failed', errors);

    const lines = po.lines.map((l) => ({ ...l }));
    let payable = 0;
    for (const r of input.lines) {
      const line = lines[r.index]!;
      const productId = line.productId!.toString();

      // Weighted average cost across all warehouses.
      const [stock] = await StockLevelModel.aggregate<{ qty: number }>([
        { $match: { productId: new Types.ObjectId(productId) } },
        { $group: { _id: null, qty: { $sum: '$quantity' } } },
      ]).session(session);
      const product = await ProductModel.findById(productId).session(session).select('avgCost').lean();
      const oldQty = Math.max(0, stock?.qty ?? 0);
      const oldAvg = product?.avgCost ?? 0;
      const avgCost = Math.round((oldQty * oldAvg + r.quantity * line.unitPrice) / (oldQty + r.quantity));
      await ProductModel.updateOne({ _id: productId }, { $set: { avgCost } }, { session });

      await applyStockChanges(
        [
          {
            productId,
            warehouseId: po.warehouseId.toString(),
            quantity: r.quantity,
            type: 'IN',
            unitCost: line.unitPrice,
            refType: 'goodsReceipt',
            refId: po._id,
          },
        ],
        session,
      );
      line.receivedQty = round3(line.receivedQty + r.quantity);
      payable += Math.round((line.lineTotal * r.quantity) / line.quantity);
    }

    const fullyReceived = lines.every((l) => l.receivedQty >= l.quantity - 1e-9);
    const updated = await PurchaseOrderModel.updateOne(
      { _id: id, updatedAt: po.updatedAt },
      { $set: { lines, status: fullyReceived ? 'received' : 'partially_received', updatedBy: currentUserId() } },
      { session },
    );
    if (updated.modifiedCount === 0) throw AppError.conflict('The purchase order changed, please try again');

    await changeSupplierBalance(po.supplierId.toString(), payable, session);
    return input.lines.map((r) => lines[r.index]!.productId!.toString());
  });
  await checkLowStock(productIds);
}
