import { currentUserId } from '../../core/context/current-user.js';
import { AppError } from '../../core/errors/app-error.js';
import { buildPaginationMeta, parseListQuery } from '../../core/utils/list-query.js';
import { getProductQuantities } from '../stock/stock.service.js';
import { ProductModel } from './product.model.js';
import type { ProductBody, UpdateProductBody } from './product.validation.js';

const LIST_OPTIONS = {
  sortable: ['name', 'sku', 'category', 'salePrice', 'avgCost', 'createdAt'],
  searchable: ['name', 'sku', 'barcode', 'category'],
  filterable: ['type', 'isActive', 'category'],
  defaultSort: '-createdAt',
} as const;

const notDeleted = { isDeleted: false };

/** reorderLevel: null clears it. */
function toUpdate(input: UpdateProductBody) {
  const { reorderLevel, ...rest } = input;
  const $set: Record<string, unknown> = { ...rest, updatedBy: currentUserId() };
  const $unset: Record<string, 1> = {};
  if (reorderLevel === null) $unset['reorderLevel'] = 1;
  else if (reorderLevel !== undefined) $set['reorderLevel'] = reorderLevel;
  return Object.keys($unset).length ? { $set, $unset } : { $set };
}

export async function listProducts(rawQuery: Record<string, unknown>) {
  const { filter, sort, skip, limit, page } = parseListQuery(rawQuery, LIST_OPTIONS);
  if (typeof filter['isActive'] === 'string') filter['isActive'] = filter['isActive'] === 'true';
  const where = { ...filter, ...notDeleted };

  const [items, total] = await Promise.all([
    ProductModel.find(where).sort(sort).skip(skip).limit(limit).lean(),
    ProductModel.countDocuments(where),
  ]);
  const quantities = await getProductQuantities(items.map((p) => p._id.toString()));
  return {
    items: items.map((p) => ({ ...p, quantity: p.type === 'stock' ? (quantities.get(p._id.toString()) ?? 0) : undefined })),
    meta: buildPaginationMeta(total, page, limit),
  };
}

export async function getProductById(id: string) {
  const product = await ProductModel.findOne({ _id: id, ...notDeleted }).lean();
  if (!product) throw AppError.notFound('Product not found');
  const quantities = await getProductQuantities([id]);
  return { ...product, quantity: product.type === 'stock' ? (quantities.get(id) ?? 0) : undefined };
}

export async function createProduct(input: ProductBody) {
  const userId = currentUserId();
  const { reorderLevel, ...rest } = input;
  const product = await ProductModel.create({
    ...rest,
    ...(reorderLevel != null ? { reorderLevel } : {}),
    createdBy: userId,
    updatedBy: userId,
  });
  return { ...product.toObject(), quantity: product.type === 'stock' ? 0 : undefined };
}

export async function updateProduct(id: string, input: UpdateProductBody) {
  if (input.type) {
    const current = await ProductModel.findOne({ _id: id, ...notDeleted }).select('type').lean();
    if (current && current.type !== input.type && (await getProductQuantities([id])).get(id)) {
      throw AppError.conflict('Cannot change the type of a product that has stock');
    }
  }
  const product = await ProductModel.findOneAndUpdate({ _id: id, ...notDeleted }, toUpdate(input), {
    returnDocument: 'after',
    runValidators: true,
  }).lean();
  if (!product) throw AppError.notFound('Product not found');
  return product;
}

/** Soft delete; products with stock on hand cannot be deleted. */
export async function deleteProduct(id: string) {
  const exists = await ProductModel.exists({ _id: id, ...notDeleted });
  if (!exists) throw AppError.notFound('Product not found');
  if ((await getProductQuantities([id])).get(id)) throw AppError.conflict('Product has stock on hand');
  await ProductModel.updateOne(
    { _id: id },
    { $set: { isDeleted: true, deletedAt: new Date(), updatedBy: currentUserId() } },
  );
}
