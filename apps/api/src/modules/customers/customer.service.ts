import type { ClientSession } from 'mongoose';
import { getRequestContext } from '../../core/context/request-context.js';
import { AppError } from '../../core/errors/app-error.js';
import { buildPaginationMeta, parseListQuery } from '../../core/utils/list-query.js';
import { CustomerModel } from './customer.model.js';
import type { CreateCustomerInput, UpdateCustomerInput } from './customer.validation.js';

const LIST_OPTIONS = {
  sortable: ['name', 'email', 'phone', 'creditLimit', 'balance', 'createdAt'],
  searchable: ['name', 'email', 'phone', 'vatNumber'],
  filterable: ['isActive'],
  defaultSort: '-createdAt',
} as const;

const notDeleted = { isDeleted: { $ne: true } };

export async function listCustomers(rawQuery: Record<string, unknown>) {
  const { filter, sort, skip, limit, page } = parseListQuery(rawQuery, LIST_OPTIONS);
  if (typeof filter['isActive'] === 'string') filter['isActive'] = filter['isActive'] === 'true';
  const where = { ...filter, ...notDeleted };

  const [items, total] = await Promise.all([
    CustomerModel.find(where).sort(sort).skip(skip).limit(limit).lean(),
    CustomerModel.countDocuments(where),
  ]);
  return { items, meta: buildPaginationMeta(total, page, limit) };
}

export async function getCustomerById(id: string) {
  const customer = await CustomerModel.findOne({ _id: id, ...notDeleted }).lean();
  if (!customer) throw AppError.notFound('Customer not found');
  return customer;
}

export async function createCustomer(input: CreateCustomerInput) {
  const userId = getRequestContext()?.userId;
  const customer = await CustomerModel.create({ ...input, createdBy: userId, updatedBy: userId });
  return customer.toObject();
}

export async function updateCustomer(id: string, input: UpdateCustomerInput) {
  const customer = await CustomerModel.findOneAndUpdate(
    { _id: id, ...notDeleted },
    { $set: { ...input, updatedBy: getRequestContext()?.userId } },
    { returnDocument: 'after', runValidators: true },
  ).lean();
  if (!customer) throw AppError.notFound('Customer not found');
  return customer;
}

/** Soft delete. Customers with an outstanding balance cannot be deleted. */
export async function deleteCustomer(id: string) {
  const customer = await CustomerModel.findOne({ _id: id, ...notDeleted }).select('balance').lean();
  if (!customer) throw AppError.notFound('Customer not found');
  if (customer.balance !== 0) throw AppError.conflict('Customer has an outstanding balance');

  await CustomerModel.updateOne(
    { _id: id },
    { $set: { isDeleted: true, deletedAt: new Date(), updatedBy: getRequestContext()?.userId } },
  );
}

/** Used by sales documents: returns the customer's name, or 400 when missing/inactive. */
export async function getActiveCustomerName(id: string, session?: ClientSession): Promise<string> {
  const customer = await CustomerModel.findOne({ _id: id, ...notDeleted, isActive: true })
    .session(session ?? null)
    .select('name')
    .lean();
  if (!customer) {
    throw AppError.badRequest('Customer not found or inactive', [{ path: 'customerId', message: 'Invalid customer' }]);
  }
  return customer.name;
}

/** Changes the receivable balance (positive = customer owes more). Runs inside the caller's transaction. */
export async function changeCustomerBalance(id: string, delta: number, session: ClientSession): Promise<void> {
  await CustomerModel.updateOne({ _id: id }, { $inc: { balance: delta } }, { session });
}
