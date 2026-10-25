export const INVOICE_STATUSES = ['draft', 'issued', 'partially_paid', 'paid', 'cancelled'] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

/** A sales/purchase document line. Money fields are integers in minor units. */
export interface DocumentLine {
  /** Empty for free-text (service) lines. */
  productId?: string;
  productType?: 'stock' | 'service';
  description: string;
  quantity: number;
  unitPrice: number;
  /** Line discount amount (minor units). */
  discount: number;
  vatRate: number;
  lineSubtotal: number;
  lineVat: number;
  lineTotal: number;
}

export interface DocumentLineInput {
  productId?: string;
  description: string;
  quantity: number;
  /** Minor units. */
  unitPrice: number;
  /** Minor units. */
  discount?: number;
  /** false = no VAT on this line. Default: product setting, or true for free-text lines. */
  vatApplicable?: boolean;
}

export interface DocumentTotals {
  subtotal: number;
  discountTotal: number;
  vatTotal: number;
  total: number;
}

export interface InvoiceActions {
  edit: boolean;
  delete: boolean;
  issue: boolean;
  cancel: boolean;
  pay: boolean;
}

export interface Invoice extends DocumentTotals {
  _id: string;
  /** Assigned on issue, e.g. INV-2026-0001. */
  number?: string;
  customerId: string;
  /** Snapshot taken when the invoice is saved. */
  customerName: string;
  warehouseId?: string;
  warehouseName?: string;
  status: InvoiceStatus;
  issueDate?: string;
  dueDate: string;
  lines: DocumentLine[];
  paidAmount: number;
  notes?: string;
  quotationId?: string;
  cancelledReason?: string;
  createdAt: string;
  updatedAt: string;
  /** Decided by the API from status + permissions. Only on single-invoice responses. */
  actions?: InvoiceActions;
}

export interface InvoiceInput {
  customerId: string;
  warehouseId?: string;
  dueDate: string;
  lines: DocumentLineInput[];
  notes?: string;
}
