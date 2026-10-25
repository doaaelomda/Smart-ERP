import type { Permission } from '@erp/shared';

export type DocumentKind = 'invoice' | 'quotation' | 'purchaseOrder';

/** What differs between invoices, quotations and purchase orders on the shared screens. */
export interface DocumentKindConfig {
  kind: DocumentKind;
  /** Translation namespace, e.g. `invoices`. */
  i18n: string;
  baseRoute: string;
  party: 'customer' | 'supplier';
  dateField: 'dueDate' | 'validUntil' | 'expectedDate';
  dateRequired: boolean;
  defaultDays: number;
  warehouse: 'optional' | 'required';
  priceMode: 'sale' | 'purchase';
  /** Secondary save button: save then run this action. */
  saveAndAction?: { labelKey: string; permission: Permission };
}

export const DOCUMENT_KINDS: Record<DocumentKind, DocumentKindConfig> = {
  invoice: {
    kind: 'invoice',
    i18n: 'invoices',
    baseRoute: '/app/sales/invoices',
    party: 'customer',
    dateField: 'dueDate',
    dateRequired: true,
    defaultDays: 14,
    warehouse: 'optional',
    priceMode: 'sale',
    saveAndAction: { labelKey: 'invoices.saveAndIssue', permission: 'invoices.issue' },
  },
  quotation: {
    kind: 'quotation',
    i18n: 'quotations',
    baseRoute: '/app/sales/quotations',
    party: 'customer',
    dateField: 'validUntil',
    dateRequired: true,
    defaultDays: 30,
    warehouse: 'optional',
    priceMode: 'sale',
    saveAndAction: { labelKey: 'quotations.saveAndSend', permission: 'quotations.update' },
  },
  purchaseOrder: {
    kind: 'purchaseOrder',
    i18n: 'purchaseOrders',
    baseRoute: '/app/purchasing/orders',
    party: 'supplier',
    dateField: 'expectedDate',
    dateRequired: false,
    defaultDays: 7,
    warehouse: 'required',
    priceMode: 'purchase',
    saveAndAction: { labelKey: 'purchaseOrders.saveAndSend', permission: 'purchaseOrders.update' },
  },
};
