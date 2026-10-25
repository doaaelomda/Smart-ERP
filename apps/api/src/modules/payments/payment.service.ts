import { currentUserId } from '../../core/context/current-user.js';
import { AppError } from '../../core/errors/app-error.js';
import { buildPaginationMeta, parseListQuery } from '../../core/utils/list-query.js';
import { withTransaction } from '../../core/utils/transaction.js';
import { nextDocumentNumber } from '../counters/counter.model.js';
import { changeCustomerBalance } from '../customers/customer.service.js';
import { InvoiceModel } from '../invoices/invoice.model.js';
import { PaymentModel } from './payment.model.js';
import type { PaymentBody } from './payment.validation.js';

const LIST_OPTIONS = {
  sortable: ['number', 'customerName', 'invoiceNumber', 'amount', 'date', 'createdAt'],
  searchable: ['number', 'customerName', 'invoiceNumber', 'reference'],
  filterable: ['customerId', 'invoiceId', 'method'],
  defaultSort: '-date',
} as const;

export async function listPayments(rawQuery: Record<string, unknown>) {
  const { filter, sort, skip, limit, page } = parseListQuery(rawQuery, LIST_OPTIONS);
  const [items, total] = await Promise.all([
    PaymentModel.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    PaymentModel.countDocuments(filter),
  ]);
  return { items, meta: buildPaginationMeta(total, page, limit) };
}

export async function getPaymentById(id: string) {
  const payment = await PaymentModel.findById(id).lean();
  if (!payment) throw AppError.notFound('Payment not found');
  return payment;
}

/** Spec 8.4: amount ≤ remaining; updates invoice paidAmount/status and customer balance atomically. */
export async function createPayment(input: PaymentBody) {
  return withTransaction(async (session) => {
    const invoice = await InvoiceModel.findOne({ _id: input.invoiceId, isDeleted: false }).session(session).lean();
    if (!invoice) throw AppError.badRequest('Invoice not found', [{ path: 'invoiceId', message: 'Invalid invoice' }]);
    if (!['issued', 'partially_paid'].includes(invoice.status)) {
      throw AppError.invalidTransition('Payments can only be recorded on issued, unpaid invoices');
    }
    const remaining = invoice.total - invoice.paidAmount;
    if (input.amount > remaining) {
      throw AppError.badRequest('Amount is more than the remaining balance', [
        { path: 'amount', message: `max:${remaining}` },
      ]);
    }

    const paidAmount = invoice.paidAmount + input.amount;
    const updated = await InvoiceModel.updateOne(
      { _id: invoice._id, paidAmount: invoice.paidAmount },
      { $set: { paidAmount, status: paidAmount === invoice.total ? 'paid' : 'partially_paid' } },
      { session },
    );
    // Another payment changed the invoice meanwhile.
    if (updated.modifiedCount === 0) throw AppError.conflict('The invoice changed, please try again');

    const number = await nextDocumentNumber('payment', 'PAY', session);
    const [payment] = await PaymentModel.create(
      [
        {
          ...input,
          number,
          date: input.date ?? new Date(),
          customerId: invoice.customerId,
          customerName: invoice.customerName,
          invoiceNumber: invoice.number ?? '',
          createdBy: currentUserId(),
        },
      ],
      { session },
    );
    await changeCustomerBalance(invoice.customerId.toString(), -input.amount, session);
    return payment!.toObject();
  });
}
