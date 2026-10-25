import { Schema, type ClientSession } from 'mongoose';
import { calcLine, type ApiErrorDetail } from '@erp/shared';
import { z } from 'zod';
import { currentTenantId } from '../../core/context/current-user.js';
import { AppError } from '../../core/errors/app-error.js';
import { moneySchema, objectIdSchema, quantitySchema } from '../../core/utils/validation.js';
import { ProductModel } from '../products/product.model.js';
import { TenantModel } from '../tenants/tenant.model.js';

/** Line schema shared by invoices, quotations and purchase orders. */
export const documentLineFields = {
  productId: { type: Schema.Types.ObjectId, ref: 'Product' },
  productType: { type: String, enum: ['stock', 'service'] },
  description: { type: String, required: true, trim: true, maxlength: 300 },
  quantity: { type: Number, required: true, min: 0 },
  /** Minor units (sale price, or unit cost on purchase orders). */
  unitPrice: { type: Number, required: true, min: 0 },
  discount: { type: Number, default: 0, min: 0 },
  /** Copied from tenant settings when saved (historical accuracy). */
  vatRate: { type: Number, required: true, min: 0, max: 100 },
  lineSubtotal: { type: Number, required: true },
  lineVat: { type: Number, required: true },
  lineTotal: { type: Number, required: true },
} as const;

export const documentTotalsFields = {
  subtotal: { type: Number, required: true },
  discountTotal: { type: Number, required: true },
  vatTotal: { type: Number, required: true },
  total: { type: Number, required: true },
} as const;

export const documentLineInputSchema = z.object({
  productId: objectIdSchema.optional(),
  description: z.string().trim().max(300).default(''),
  quantity: quantitySchema,
  unitPrice: moneySchema,
  discount: moneySchema.optional(),
  vatApplicable: z.boolean().optional(),
});

export const documentLinesSchema = z.array(documentLineInputSchema).min(1).max(200);

export type DocumentLineBody = z.infer<typeof documentLineInputSchema>;

export interface BuiltLine {
  productId?: string;
  productType?: 'stock' | 'service';
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  vatRate: number;
  lineSubtotal: number;
  lineVat: number;
  lineTotal: number;
}

export interface BuildLinesOptions {
  session?: ClientSession;
  /** Purchase orders: every line must be an active stock product. */
  requireStockProducts?: boolean;
}

export async function getTenantVatRate(session?: ClientSession): Promise<number> {
  const tenant = await TenantModel.findById(currentTenantId()).session(session ?? null).select('vatRate').lean();
  return tenant?.vatRate ?? 0;
}

/**
 * Validates lines and recalculates every amount on the server (client totals are ignored, spec 8.2).
 * Totals: subtotal (before discount) − discountTotal + vatTotal = total.
 */
export async function buildDocumentLines(inputs: DocumentLineBody[], options: BuildLinesOptions = {}) {
  const vatRate = await getTenantVatRate(options.session);
  const ids = [...new Set(inputs.map((l) => l.productId).filter((id): id is string => !!id))];
  const products = await ProductModel.find({ _id: { $in: ids }, isDeleted: false })
    .session(options.session ?? null)
    .select('name type vatApplicable isActive')
    .lean();
  const byId = new Map(products.map((p) => [p._id.toString(), p]));

  const errors: ApiErrorDetail[] = [];
  const lines: BuiltLine[] = inputs.map((input, i) => {
    const product = input.productId ? byId.get(input.productId) : undefined;
    if (input.productId && (!product || !product.isActive)) {
      errors.push({ path: `lines.${i}.productId`, message: 'Product not found or inactive' });
    }
    if (options.requireStockProducts && product?.type !== 'stock') {
      errors.push({ path: `lines.${i}.productId`, message: 'Choose a stock product' });
    }
    const description = input.description || product?.name || '';
    if (!description) errors.push({ path: `lines.${i}.description`, message: 'Description is required' });

    const discount = input.discount ?? 0;
    if (discount > Math.round(input.quantity * input.unitPrice)) {
      errors.push({ path: `lines.${i}.discount`, message: 'Discount is larger than the line amount' });
    }
    const vatApplicable = input.vatApplicable ?? product?.vatApplicable ?? true;
    const rate = vatApplicable ? vatRate : 0;

    return {
      ...(product ? { productId: input.productId, productType: product.type } : {}),
      description,
      quantity: input.quantity,
      unitPrice: input.unitPrice,
      discount,
      vatRate: rate,
      ...calcLine(input.quantity, input.unitPrice, discount, rate),
    };
  });
  if (errors.length) throw AppError.badRequest('Validation failed', errors);

  const totals = lines.reduce(
    (t, l) => ({
      subtotal: t.subtotal + l.lineSubtotal + l.discount,
      discountTotal: t.discountTotal + l.discount,
      vatTotal: t.vatTotal + l.lineVat,
      total: t.total + l.lineTotal,
    }),
    { subtotal: 0, discountTotal: 0, vatTotal: 0, total: 0 },
  );
  return { lines, totals };
}

/** Permission-aware action flags (the UI shows buttons only when the API says so). */
export function hasAny(permissions: Set<string>, ...required: string[]): boolean {
  return required.some((p) => permissions.has(p));
}
