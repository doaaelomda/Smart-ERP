import type { DocumentLine, DocumentLineInput, DocumentTotals } from './invoice.js';

export const PAYMENT_METHODS = ['cash', 'bank_transfer', 'card'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export interface Payment {
  _id: string;
  number: string;
  customerId: string;
  customerName: string;
  invoiceId: string;
  invoiceNumber: string;
  /** Minor units. */
  amount: number;
  method: PaymentMethod;
  date: string;
  reference?: string;
  notes?: string;
  createdAt: string;
}

export interface PaymentInput {
  invoiceId: string;
  amount: number;
  method: PaymentMethod;
  date?: string;
  reference?: string;
  notes?: string;
}

export const QUOTATION_STATUSES = ['draft', 'sent', 'accepted', 'rejected', 'converted'] as const;
export type QuotationStatus = (typeof QUOTATION_STATUSES)[number];

export interface QuotationActions {
  edit: boolean;
  delete: boolean;
  send: boolean;
  accept: boolean;
  reject: boolean;
  convert: boolean;
}

export interface Quotation extends DocumentTotals {
  _id: string;
  number: string;
  customerId: string;
  customerName: string;
  status: QuotationStatus;
  /** True when sent and validUntil has passed (computed). */
  isExpired?: boolean;
  validUntil: string;
  lines: DocumentLine[];
  notes?: string;
  invoiceId?: string;
  createdAt: string;
  updatedAt: string;
  actions?: QuotationActions;
}

export interface QuotationInput {
  customerId: string;
  validUntil: string;
  lines: DocumentLineInput[];
  notes?: string;
}
