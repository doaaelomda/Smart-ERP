import type { DocumentLine, DocumentLineInput, DocumentTotals } from './invoice.js';

export interface Supplier {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  vatNumber?: string;
  address?: string;
  /** Amount we owe the supplier (minor units), increased by goods receipts. */
  balance: number;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierInput {
  name: string;
  email?: string;
  phone?: string;
  vatNumber?: string;
  address?: string;
  notes?: string;
  isActive?: boolean;
}

export const PURCHASE_ORDER_STATUSES = ['draft', 'sent', 'partially_received', 'received', 'cancelled'] as const;
export type PurchaseOrderStatus = (typeof PURCHASE_ORDER_STATUSES)[number];

/** `unitPrice` is the purchase unit cost. */
export interface PurchaseOrderLine extends DocumentLine {
  receivedQty: number;
}

export interface PurchaseOrderActions {
  edit: boolean;
  delete: boolean;
  send: boolean;
  receive: boolean;
  cancel: boolean;
}

export interface PurchaseOrder extends DocumentTotals {
  _id: string;
  number: string;
  supplierId: string;
  supplierName: string;
  warehouseId: string;
  warehouseName: string;
  status: PurchaseOrderStatus;
  orderDate: string;
  expectedDate?: string;
  /** True when expectedDate passed and not fully received (computed). */
  isLate?: boolean;
  lines: PurchaseOrderLine[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
  actions?: PurchaseOrderActions;
}

export interface PurchaseOrderInput {
  supplierId: string;
  warehouseId: string;
  orderDate?: string;
  expectedDate?: string;
  /** Every line needs a stock productId; unitPrice = unit cost. */
  lines: DocumentLineInput[];
  notes?: string;
}

export interface ReceivePurchaseOrderInput {
  /** Quantity received now, per line index. */
  lines: { index: number; quantity: number }[];
}
