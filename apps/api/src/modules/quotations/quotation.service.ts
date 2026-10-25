import type { Permission, QuotationActions, QuotationStatus } from '@erp/shared';
import { currentUserId } from '../../core/context/current-user.js';
import { AppError } from '../../core/errors/app-error.js';
import { buildPaginationMeta, parseListQuery } from '../../core/utils/list-query.js';
import { nextDocumentNumber } from '../counters/counter.model.js';
import { getActiveCustomerName } from '../customers/customer.service.js';
import { buildDocumentLines } from '../documents/document-lines.js';
import { createInvoice } from '../invoices/invoice.service.js';
import { QuotationModel } from './quotation.model.js';
import type { ConvertQuotationBody, QuotationBody, UpdateQuotationBody } from './quotation.validation.js';

const LIST_OPTIONS = {
  sortable: ['number', 'customerName', 'validUntil', 'total', 'status', 'createdAt'],
  searchable: ['number', 'customerName'],
  filterable: ['status', 'customerId'],
  defaultSort: '-createdAt',
} as const;

const notDeleted = { isDeleted: false };
const DAY = 86_400_000;

type QuotationDoc = { status: string; validUntil: Date };

const isExpired = (q: QuotationDoc) => q.status === 'sent' && q.validUntil.getTime() < Date.now();

export function quotationActions(q: QuotationDoc, permissions: Set<Permission>): QuotationActions {
  const can = (p: Permission) => permissions.has(p);
  const status = q.status as QuotationStatus;
  return {
    edit: status === 'draft' && can('quotations.update'),
    delete: status === 'draft' && can('quotations.update'),
    send: status === 'draft' && can('quotations.update'),
    accept: status === 'sent' && !isExpired(q) && can('quotations.update'),
    reject: status === 'sent' && can('quotations.update'),
    convert: status === 'accepted' && can('quotations.convert') && can('invoices.create'),
  };
}

const withExpiry = <T extends QuotationDoc>(q: T) => ({ ...q, isExpired: isExpired(q) });

export async function listQuotations(rawQuery: Record<string, unknown>) {
  const { filter, sort, skip, limit, page } = parseListQuery(rawQuery, LIST_OPTIONS);
  const where = { ...filter, ...notDeleted };
  const [items, total] = await Promise.all([
    QuotationModel.find(where).sort(sort).skip(skip).limit(limit).select('-lines').lean(),
    QuotationModel.countDocuments(where),
  ]);
  return { items: items.map(withExpiry), meta: buildPaginationMeta(total, page, limit) };
}

async function findQuotation(id: string) {
  const quotation = await QuotationModel.findOne({ _id: id, ...notDeleted }).lean();
  if (!quotation) throw AppError.notFound('Quotation not found');
  return quotation;
}

export async function getQuotationById(id: string, permissions: Set<Permission>) {
  const quotation = await findQuotation(id);
  return { ...withExpiry(quotation), actions: quotationActions(quotation, permissions) };
}

export async function createQuotation(input: QuotationBody) {
  const customerName = await getActiveCustomerName(input.customerId);
  const { lines, totals } = await buildDocumentLines(input.lines);
  const userId = currentUserId();
  const quotation = await QuotationModel.create({
    ...input,
    number: await nextDocumentNumber('quotation', 'QUO'),
    customerName,
    lines,
    ...totals,
    createdBy: userId,
    updatedBy: userId,
  });
  return quotation.toObject();
}

export async function updateQuotation(id: string, input: UpdateQuotationBody) {
  const current = await findQuotation(id);
  if (current.status !== 'draft') throw AppError.invalidTransition('Only draft quotations can be edited');
  const $set: Record<string, unknown> = { ...input, updatedBy: currentUserId() };
  if (input.customerId) $set['customerName'] = await getActiveCustomerName(input.customerId);
  if (input.lines) {
    const { lines, totals } = await buildDocumentLines(input.lines);
    Object.assign($set, { lines, ...totals });
  }
  const updated = await QuotationModel.findOneAndUpdate({ _id: id, status: 'draft' }, { $set }, {
    returnDocument: 'after',
    runValidators: true,
  }).lean();
  if (!updated) throw AppError.invalidTransition('Only draft quotations can be edited');
  return updated;
}

export async function deleteQuotation(id: string) {
  const current = await findQuotation(id);
  if (current.status !== 'draft') throw AppError.invalidTransition('Only draft quotations can be deleted');
  await QuotationModel.updateOne({ _id: id, status: 'draft' }, { $set: { isDeleted: true, deletedAt: new Date() } });
}

/** draft → sent, sent → accepted | rejected. */
export async function changeQuotationStatus(id: string, action: 'send' | 'accept' | 'reject') {
  const current = await findQuotation(id);
  const from: QuotationStatus = action === 'send' ? 'draft' : 'sent';
  const to: QuotationStatus = action === 'send' ? 'sent' : action === 'accept' ? 'accepted' : 'rejected';
  if (current.status !== from) throw AppError.invalidTransition();
  if (action === 'accept' && isExpired(current)) throw AppError.invalidTransition('This quotation has expired');

  const updated = await QuotationModel.findOneAndUpdate(
    { _id: id, status: from },
    { $set: { status: to, updatedBy: currentUserId() } },
    { returnDocument: 'after' },
  ).lean();
  if (!updated) throw AppError.invalidTransition();
  return updated;
}

/** accepted → converted: creates a draft invoice with the same lines (prices recalculated with today's VAT). */
export async function convertQuotation(id: string, input: ConvertQuotationBody) {
  const quotation = await findQuotation(id);
  if (quotation.status !== 'accepted') throw AppError.invalidTransition('Only accepted quotations can be converted');

  // Claim first so a double click can't create two invoices.
  const claimed = await QuotationModel.updateOne({ _id: id, status: 'accepted' }, { $set: { status: 'converted' } });
  if (claimed.modifiedCount === 0) throw AppError.invalidTransition('Only accepted quotations can be converted');

  try {
    const invoice = await createInvoice(
      {
        customerId: quotation.customerId.toString(),
        warehouseId: input.warehouseId,
        dueDate: input.dueDate ?? new Date(Date.now() + 14 * DAY),
        notes: quotation.notes ?? undefined,
        lines: quotation.lines.map((l) => ({
          productId: l.productId?.toString(),
          description: l.description,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          discount: l.discount,
          vatApplicable: l.vatRate > 0,
        })),
      },
      { quotationId: id },
    );
    await QuotationModel.updateOne({ _id: id }, { $set: { invoiceId: invoice._id, updatedBy: currentUserId() } });
    return invoice;
  } catch (err) {
    await QuotationModel.updateOne({ _id: id, status: 'converted' }, { $set: { status: 'accepted' } });
    throw err;
  }
}
