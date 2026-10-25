import { Types, type ClientSession } from 'mongoose';
import type { ApiErrorDetail, StockMovementType, StockRefType } from '@erp/shared';
import { logger } from '../../config/logger.js';
import { currentTenantId, currentUserId } from '../../core/context/current-user.js';
import { AppError } from '../../core/errors/app-error.js';
import { buildPaginationMeta, parseListQuery } from '../../core/utils/list-query.js';
import { withTransaction } from '../../core/utils/transaction.js';
import { NotificationModel } from '../notifications/notification.model.js';
import { notify } from '../notifications/notification.service.js';
import { ProductModel } from '../products/product.model.js';
import { assertActiveWarehouse } from '../warehouses/warehouse.service.js';
import { StockLevelModel } from './stock-level.model.js';
import { StockMovementModel } from './stock-movement.model.js';
import type { AdjustmentBody, TransferBody } from './stock.validation.js';

export interface StockChange {
  productId: string;
  warehouseId: string;
  /** Signed delta. */
  quantity: number;
  type: StockMovementType;
  unitCost: number;
  refType: StockRefType;
  refId?: string | Types.ObjectId;
  reason?: string;
}

const round3 = (n: number) => Math.round(n * 1000) / 1000;

/**
 * Applies stock changes atomically inside the caller's transaction and appends ledger rows.
 * Outgoing quantities never go below zero: any shortage throws 409 INSUFFICIENT_STOCK
 * (details list every short product) and the transaction is rolled back.
 */
export async function applyStockChanges(changes: StockChange[], session: ClientSession): Promise<void> {
  const shortages: ApiErrorDetail[] = [];

  for (const change of changes) {
    const delta = round3(change.quantity);
    const key = { productId: change.productId, warehouseId: change.warehouseId };
    if (delta < 0) {
      const updated = await StockLevelModel.findOneAndUpdate(
        { ...key, quantity: { $gte: -delta - 1e-9 } },
        { $inc: { quantity: delta } },
        { session, returnDocument: 'after' },
      ).lean();
      if (!updated) {
        const level = await StockLevelModel.findOne(key).session(session).select('quantity').lean();
        shortages.push({ path: change.productId, message: `available:${level?.quantity ?? 0}` });
      } else if (Math.abs(updated.quantity) < 1e-9 && updated.quantity !== 0) {
        await StockLevelModel.updateOne({ _id: updated._id }, { $set: { quantity: 0 } }, { session });
      }
    } else {
      await StockLevelModel.updateOne(key, { $inc: { quantity: delta } }, { upsert: true, session });
    }
  }
  if (shortages.length) throw AppError.insufficientStock(shortages);

  const tenantId = currentTenantId();
  const createdBy = currentUserId();
  await StockMovementModel.insertMany(
    changes.map((c) => ({ ...c, quantity: round3(c.quantity), tenantId, createdBy })),
    { session },
  );
}

/** Total quantity per product across all warehouses. */
export async function getProductQuantities(productIds: string[]): Promise<Map<string, number>> {
  if (productIds.length === 0) return new Map();
  const rows = await StockLevelModel.aggregate<{ _id: Types.ObjectId; quantity: number }>([
    { $match: { productId: { $in: productIds.map((id) => new Types.ObjectId(id)) } } },
    { $group: { _id: '$productId', quantity: { $sum: '$quantity' } } },
  ]);
  return new Map(rows.map((r) => [r._id.toString(), round3(r.quantity)]));
}

/**
 * Low stock alerts (spec 9.2), run after a stock change is committed.
 * One active alert per product: when stock recovers the dedupe key is released so it can alert again.
 */
export async function checkLowStock(productIds: string[]): Promise<void> {
  try {
    const tenantId = currentTenantId();
    const unique = [...new Set(productIds.map(String))];
    const products = await ProductModel.find({ _id: { $in: unique }, type: 'stock', reorderLevel: { $exists: true } })
      .select('name reorderLevel')
      .lean();
    if (!products.length) return;
    const quantities = await getProductQuantities(products.map((p) => p._id.toString()));

    for (const product of products) {
      const id = product._id.toString();
      const qty = quantities.get(id) ?? 0;
      const dedupeKey = `lowStock:${id}`;
      if (qty <= (product.reorderLevel ?? 0)) {
        await notify({
          tenantId,
          permission: 'stock.view',
          type: 'lowStock',
          messageKey: 'notifications.lowStock',
          params: { product: product.name, qty },
          link: '/app/inventory/stock',
          dedupeKey,
        });
      } else {
        await NotificationModel.updateMany({ dedupeKey }, { $unset: { dedupeKey: 1 } });
      }
    }
  } catch (err) {
    logger.warn({ err }, 'Low stock check failed');
  }
}

async function loadStockProduct(productId: string, session: ClientSession) {
  const product = await ProductModel.findOne({ _id: productId, isDeleted: false })
    .session(session)
    .select('type avgCost name isActive')
    .lean();
  if (!product) throw AppError.badRequest('Product not found', [{ path: 'productId', message: 'Invalid product' }]);
  if (product.type !== 'stock') {
    throw AppError.badRequest('Services have no stock', [{ path: 'productId', message: 'Not a stock product' }]);
  }
  return product;
}

export async function adjustStock(input: AdjustmentBody) {
  const refId = new Types.ObjectId();
  await withTransaction(async (session) => {
    const product = await loadStockProduct(input.productId, session);
    await assertActiveWarehouse(input.warehouseId, session);
    await applyStockChanges(
      [
        {
          productId: input.productId,
          warehouseId: input.warehouseId,
          quantity: input.quantity,
          type: 'ADJUSTMENT',
          unitCost: product.avgCost,
          refType: 'adjustment',
          refId,
          reason: input.reason,
        },
      ],
      session,
    );
  });
  await checkLowStock([input.productId]);
}

export async function transferStock(input: TransferBody) {
  const refId = new Types.ObjectId();
  await withTransaction(async (session) => {
    const product = await loadStockProduct(input.productId, session);
    await assertActiveWarehouse(input.fromWarehouseId, session);
    await assertActiveWarehouse(input.toWarehouseId, session);
    const base = { productId: input.productId, unitCost: product.avgCost, refType: 'transfer' as const, refId, reason: input.reason };
    await applyStockChanges(
      [
        { ...base, warehouseId: input.fromWarehouseId, quantity: -input.quantity, type: 'TRANSFER_OUT' },
        { ...base, warehouseId: input.toWarehouseId, quantity: input.quantity, type: 'TRANSFER_IN' },
      ],
      session,
    );
  });
}

const LEVEL_SORT: Record<string, string> = {
  productName: 'productName',
  sku: 'sku',
  warehouseName: 'warehouseName',
  quantity: 'quantity',
  value: 'value',
};

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Stock per product per warehouse, with search / sort / pagination and a low-stock filter. */
export async function listStockLevels(rawQuery: Record<string, unknown>) {
  const { sort, skip, limit, page } = parseListQuery(rawQuery, { sortable: Object.keys(LEVEL_SORT), defaultSort: 'productName' });
  const match: Record<string, unknown> = {};
  for (const field of ['productId', 'warehouseId'] as const) {
    const value = rawQuery[field];
    if (typeof value === 'string' && Types.ObjectId.isValid(value)) match[field] = new Types.ObjectId(value);
  }
  const search = typeof rawQuery['search'] === 'string' ? rawQuery['search'].trim().slice(0, 100) : '';
  const after: Record<string, unknown> = {};
  if (search) {
    const regex = new RegExp(escapeRegex(search), 'i');
    after['$or'] = [{ productName: regex }, { sku: regex }, { warehouseName: regex }];
  }
  if (rawQuery['lowStock'] === 'true') after['isLow'] = true;
  if (rawQuery['hideZero'] === 'true') after['quantity'] = { $ne: 0 };

  const [result] = await StockLevelModel.aggregate<{ items: unknown[]; total: { count: number }[] }>([
    { $match: match },
    { $lookup: { from: 'products', localField: 'productId', foreignField: '_id', as: 'product' } },
    { $unwind: '$product' },
    { $match: { 'product.isDeleted': false } },
    { $lookup: { from: 'warehouses', localField: 'warehouseId', foreignField: '_id', as: 'warehouse' } },
    { $unwind: '$warehouse' },
    { $match: { 'warehouse.isDeleted': false } },
    {
      $project: {
        productId: 1,
        warehouseId: 1,
        quantity: 1,
        productName: '$product.name',
        sku: '$product.sku',
        unit: '$product.unit',
        reorderLevel: '$product.reorderLevel',
        avgCost: '$product.avgCost',
        warehouseName: '$warehouse.name',
        value: { $round: [{ $multiply: ['$quantity', '$product.avgCost'] }, 0] },
        isLow: {
          $and: [{ $ne: [{ $type: '$product.reorderLevel' }, 'missing'] }, { $lte: ['$quantity', '$product.reorderLevel'] }],
        },
      },
    },
    { $match: after },
    { $sort: sort },
    { $facet: { items: [{ $skip: skip }, { $limit: limit }], total: [{ $count: 'count' }] } },
  ]);
  const total = result?.total[0]?.count ?? 0;
  return { items: result?.items ?? [], meta: buildPaginationMeta(total, page, limit) };
}

/** Stock ledger, newest first. */
export async function listStockMovements(rawQuery: Record<string, unknown>) {
  const { filter, sort, skip, limit, page } = parseListQuery(rawQuery, {
    sortable: ['createdAt', 'quantity', 'type'],
    filterable: ['productId', 'warehouseId', 'type', 'refType'],
    defaultSort: '-createdAt',
  });
  const [items, total] = await Promise.all([
    StockMovementModel.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate<{ productId: { _id: Types.ObjectId; name: string } | null }>('productId', 'name')
      .populate<{ warehouseId: { _id: Types.ObjectId; name: string } | null }>('warehouseId', 'name')
      .lean(),
    StockMovementModel.countDocuments(filter),
  ]);
  return {
    items: items.map((m) => ({
      ...m,
      productId: m.productId?._id,
      productName: m.productId?.name ?? '—',
      warehouseId: m.warehouseId?._id,
      warehouseName: m.warehouseId?.name ?? '—',
    })),
    meta: buildPaginationMeta(total, page, limit),
  };
}
