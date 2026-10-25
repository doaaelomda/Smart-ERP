import type { ClientSession } from 'mongoose';
import { getRequestContext } from '../../core/context/request-context.js';
import { AppError } from '../../core/errors/app-error.js';
import { buildPaginationMeta, parseListQuery } from '../../core/utils/list-query.js';
import { SupplierModel } from './supplier.model.js';
import type { CreateSupplierInput, UpdateSupplierInput } from './supplier.validation.js';

const LIST_OPTIONS = {
  sortable: ['name', 'email', 'phone', 'balance', 'createdAt'],
  searchable: ['name', 'email', 'phone', 'vatNumber'],
  filterable: ['isActive'],
  defaultSort: '-createdAt',
} as const;

const notDeleted = { isDeleted: { $ne: true } };

export async function listSuppliers(rawQuery: Record<string, unknown>) {
  const { filter, sort, skip, limit, page } = parseListQuery(rawQuery, LIST_OPTIONS);
  if (typeof filter['isActive'] === 'string') filter['isActive'] = filter['isActive'] === 'true';
  const where = { ...filter, ...notDeleted };

  const [items, total] = await Promise.all([
    SupplierModel.find(where).sort(sort).skip(skip).limit(limit).lean(),
    SupplierModel.countDocuments(where),
  ]);
  return { items, meta: buildPaginationMeta(total, page, limit) };
}

export async function getSupplierById(id: string) {
  const supplier = await SupplierModel.findOne({ _id: id, ...notDeleted }).lean();
  if (!supplier) throw AppError.notFound('Supplier not found');
  return supplier;
}

export async function createSupplier(input: CreateSupplierInput) {
  const userId = getRequestContext()?.userId;
  const supplier = await SupplierModel.create({ ...input, createdBy: userId, updatedBy: userId });
  return supplier.toObject();
}

export async function updateSupplier(id: string, input: UpdateSupplierInput) {
  const supplier = await SupplierModel.findOneAndUpdate(
    { _id: id, ...notDeleted },
    { $set: { ...input, updatedBy: getRequestContext()?.userId } },
    { returnDocument: 'after', runValidators: true },
  ).lean();
  if (!supplier) throw AppError.notFound('Supplier not found');
  return supplier;
}

/** Soft delete. Suppliers we still owe cannot be deleted. */
export async function deleteSupplier(id: string) {
  const supplier = await SupplierModel.findOne({ _id: id, ...notDeleted }).select('balance').lean();
  if (!supplier) throw AppError.notFound('Supplier not found');
  if (supplier.balance !== 0) throw AppError.conflict('Supplier has an outstanding balance');

  await SupplierModel.updateOne(
    { _id: id },
    { $set: { isDeleted: true, deletedAt: new Date(), updatedBy: getRequestContext()?.userId } },
  );
}

/** Used by purchase orders: returns the supplier's name, or 400 when missing/inactive. */
export async function getActiveSupplierName(id: string, session?: ClientSession): Promise<string> {
  const supplier = await SupplierModel.findOne({ _id: id, ...notDeleted, isActive: true })
    .session(session ?? null)
    .select('name')
    .lean();
  if (!supplier) {
    throw AppError.badRequest('Supplier not found or inactive', [{ path: 'supplierId', message: 'Invalid supplier' }]);
  }
  return supplier.name;
}

/** Changes the payable balance (positive = we owe more). Runs inside the caller's transaction. */
export async function changeSupplierBalance(id: string, delta: number, session: ClientSession): Promise<void> {
  await SupplierModel.updateOne({ _id: id }, { $inc: { balance: delta } }, { session });
}
