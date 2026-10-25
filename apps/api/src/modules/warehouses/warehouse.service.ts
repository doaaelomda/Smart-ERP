import type { ClientSession } from 'mongoose';
import { currentUserId } from '../../core/context/current-user.js';
import { AppError } from '../../core/errors/app-error.js';
import { buildPaginationMeta, parseListQuery } from '../../core/utils/list-query.js';
import { withTransaction } from '../../core/utils/transaction.js';
import { StockLevelModel } from '../stock/stock-level.model.js';
import { WarehouseModel } from './warehouse.model.js';
import type { UpdateWarehouseBody, WarehouseBody } from './warehouse.validation.js';

const LIST_OPTIONS = {
  sortable: ['name', 'code', 'createdAt'],
  searchable: ['name', 'code', 'address'],
  filterable: ['isActive'],
  defaultSort: 'name',
} as const;

const notDeleted = { isDeleted: false };

/** Creates the tenant's first warehouse (on registration). */
export async function createDefaultWarehouse(tenantId: string, name: string, session?: ClientSession) {
  await WarehouseModel.create([{ tenantId, name, code: 'MAIN', isDefault: true }], { session });
}

/** Default warehouse id, falling back to the first active one. */
export async function getDefaultWarehouseId(session?: ClientSession): Promise<string> {
  const warehouse =
    (await WarehouseModel.findOne({ ...notDeleted, isActive: true, isDefault: true }).session(session ?? null).select('_id').lean()) ??
    (await WarehouseModel.findOne({ ...notDeleted, isActive: true }).sort({ createdAt: 1 }).session(session ?? null).select('_id').lean());
  if (!warehouse) throw AppError.badRequest('Create a warehouse first', [{ path: 'warehouseId', message: 'No active warehouse' }]);
  return warehouse._id.toString();
}

/** Throws 400 when the warehouse doesn't exist or is inactive. Returns its name. */
export async function assertActiveWarehouse(id: string, session?: ClientSession): Promise<string> {
  const warehouse = await WarehouseModel.findOne({ _id: id, ...notDeleted, isActive: true })
    .session(session ?? null)
    .select('name')
    .lean();
  if (!warehouse) throw AppError.badRequest('Warehouse not found or inactive', [{ path: 'warehouseId', message: 'Invalid warehouse' }]);
  return warehouse.name;
}

export async function listWarehouses(rawQuery: Record<string, unknown>) {
  const { filter, sort, skip, limit, page } = parseListQuery(rawQuery, LIST_OPTIONS);
  if (typeof filter['isActive'] === 'string') filter['isActive'] = filter['isActive'] === 'true';
  const where = { ...filter, ...notDeleted };
  const [items, total] = await Promise.all([
    WarehouseModel.find(where).sort(sort).skip(skip).limit(limit).lean(),
    WarehouseModel.countDocuments(where),
  ]);
  return { items, meta: buildPaginationMeta(total, page, limit) };
}

export async function getWarehouseById(id: string) {
  const warehouse = await WarehouseModel.findOne({ _id: id, ...notDeleted }).lean();
  if (!warehouse) throw AppError.notFound('Warehouse not found');
  return warehouse;
}

export async function createWarehouse(input: WarehouseBody) {
  const userId = currentUserId();
  return withTransaction(async (session) => {
    const isFirst = (await WarehouseModel.countDocuments(notDeleted).session(session)) === 0;
    const isDefault = input.isDefault || isFirst;
    if (isDefault) await WarehouseModel.updateMany({ isDefault: true }, { $set: { isDefault: false } }, { session });
    const [warehouse] = await WarehouseModel.create(
      [{ ...input, isDefault, isActive: isDefault ? true : (input.isActive ?? true), createdBy: userId, updatedBy: userId }],
      { session },
    );
    return warehouse!.toObject();
  });
}

export async function updateWarehouse(id: string, input: UpdateWarehouseBody) {
  return withTransaction(async (session) => {
    const current = await WarehouseModel.findOne({ _id: id, ...notDeleted }).session(session).lean();
    if (!current) throw AppError.notFound('Warehouse not found');
    if (current.isDefault && (input.isDefault === false || input.isActive === false)) {
      throw AppError.conflict('Set another warehouse as default first');
    }
    if (input.isDefault && !current.isDefault) {
      await WarehouseModel.updateMany({ isDefault: true }, { $set: { isDefault: false } }, { session });
    }
    return WarehouseModel.findOneAndUpdate(
      { _id: id },
      { $set: { ...input, ...(input.isDefault ? { isActive: true } : {}), updatedBy: currentUserId() } },
      { returnDocument: 'after', runValidators: true, session },
    ).lean();
  });
}

/** Soft delete; not allowed for the default warehouse or one that holds stock. */
export async function deleteWarehouse(id: string) {
  const warehouse = await WarehouseModel.findOne({ _id: id, ...notDeleted }).select('isDefault').lean();
  if (!warehouse) throw AppError.notFound('Warehouse not found');
  if (warehouse.isDefault) throw AppError.conflict('The default warehouse cannot be deleted');
  if (await StockLevelModel.exists({ warehouseId: id, quantity: { $ne: 0 } })) {
    throw AppError.conflict('Warehouse has stock on hand');
  }
  await WarehouseModel.updateOne(
    { _id: id },
    { $set: { isDeleted: true, deletedAt: new Date(), isActive: false, updatedBy: currentUserId() } },
  );
}
