import type { Invoice, PurchaseOrder, Quotation } from '@erp/shared';

const OPEN = ['issued', 'partially_paid'];

/** Status shown in lists/details (adds derived overdue / expired / late). */
export function invoiceDisplayStatus(invoice: Pick<Invoice, 'status' | 'dueDate'>): string {
  return OPEN.includes(invoice.status) && new Date(invoice.dueDate).getTime() < Date.now() ? 'overdue' : invoice.status;
}

export function quotationDisplayStatus(quotation: Pick<Quotation, 'status' | 'isExpired'>): string {
  return quotation.isExpired ? 'expired' : quotation.status;
}

export function purchaseOrderDisplayStatus(po: Pick<PurchaseOrder, 'status' | 'isLate'>): string {
  return po.isLate ? 'late' : po.status;
}
