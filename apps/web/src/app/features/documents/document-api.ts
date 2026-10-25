import { inject, Injectable } from '@angular/core';
import type { DocumentLine, DocumentLineInput } from '@erp/shared';
import { map, type Observable } from 'rxjs';
import { PurchaseOrderService } from '../purchasing/purchase-order.service';
import { InvoiceService } from '../sales/invoice.service';
import { QuotationService } from '../sales/quotation.service';
import type { DocumentKind } from './document-kinds';

/** The fields the shared editor reads/writes, whatever the document kind. */
export interface EditableDocument {
  _id: string;
  partyId: string;
  partyName: string;
  date?: string;
  warehouseId?: string;
  lines: DocumentLine[];
  notes?: string;
  canEdit: boolean;
}

export interface DocumentDraft {
  partyId: string;
  date?: string;
  warehouseId?: string;
  lines: DocumentLineInput[];
  notes?: string;
}

/** Adapts the three document services to the generic editor. */
@Injectable({ providedIn: 'root' })
export class DocumentApi {
  private readonly invoices = inject(InvoiceService);
  private readonly quotations = inject(QuotationService);
  private readonly purchaseOrders = inject(PurchaseOrderService);

  getDocumentById(kind: DocumentKind, id: string): Observable<EditableDocument> {
    switch (kind) {
      case 'invoice':
        return this.invoices.getInvoiceById(id).pipe(
          map((d) => ({ _id: d._id, partyId: d.customerId, partyName: d.customerName, date: d.dueDate, warehouseId: d.warehouseId, lines: d.lines, notes: d.notes, canEdit: !!d.actions?.edit })),
        );
      case 'quotation':
        return this.quotations.getQuotationById(id).pipe(
          map((d) => ({ _id: d._id, partyId: d.customerId, partyName: d.customerName, date: d.validUntil, lines: d.lines, notes: d.notes, canEdit: !!d.actions?.edit })),
        );
      case 'purchaseOrder':
        return this.purchaseOrders.getPurchaseOrderById(id).pipe(
          map((d) => ({ _id: d._id, partyId: d.supplierId, partyName: d.supplierName, date: d.expectedDate, warehouseId: d.warehouseId, lines: d.lines, notes: d.notes, canEdit: !!d.actions?.edit })),
        );
    }
  }

  /** Create (no id) or update a draft. Returns the document id. */
  saveDocument(kind: DocumentKind, draft: DocumentDraft, id?: string): Observable<string> {
    const { partyId, date, warehouseId, lines, notes } = draft;
    switch (kind) {
      case 'invoice': {
        const body = { customerId: partyId, dueDate: date!, warehouseId, lines, notes };
        return (id ? this.invoices.updateInvoice(id, body) : this.invoices.createInvoice(body)).pipe(map((d) => d._id));
      }
      case 'quotation': {
        const body = { customerId: partyId, validUntil: date!, lines, notes };
        return (id ? this.quotations.updateQuotation(id, body) : this.quotations.createQuotation(body)).pipe(map((d) => d._id));
      }
      case 'purchaseOrder': {
        const body = { supplierId: partyId, expectedDate: date, warehouseId: warehouseId!, lines, notes };
        return (id ? this.purchaseOrders.updatePurchaseOrder(id, body) : this.purchaseOrders.createPurchaseOrder(body)).pipe(
          map((d) => d._id),
        );
      }
    }
  }

  /** The "save & …" follow-up action (issue / send). */
  runSaveAction(kind: DocumentKind, id: string): Observable<unknown> {
    switch (kind) {
      case 'invoice':
        return this.invoices.issueInvoice(id);
      case 'quotation':
        return this.quotations.changeQuotationStatus(id, 'send');
      case 'purchaseOrder':
        return this.purchaseOrders.sendPurchaseOrder(id);
    }
  }
}
