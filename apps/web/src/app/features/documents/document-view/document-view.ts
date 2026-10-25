import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import type { DocumentLine, DocumentTotals } from '@erp/shared';
import { LocalDatePipe } from '../../../shared/pipes/local-date.pipe';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { QtyPipe } from '../../../shared/pipes/qty.pipe';

export interface DocumentMetaItem {
  labelKey: string;
  value: string | number | null | undefined;
  type?: 'text' | 'date' | 'money';
  /** Highlight (e.g. overdue due date). */
  danger?: boolean;
}

/** Read-only body of an invoice / quotation / purchase order: party, meta, lines and totals. */
@Component({
  selector: 'app-document-view',
  imports: [TranslatePipe, LocalDatePipe, MoneyPipe, QtyPipe],
  templateUrl: './document-view.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocumentView {
  readonly partyLabel = input.required<string>();
  readonly partyName = input.required<string>();
  readonly meta = input<DocumentMetaItem[]>([]);
  readonly lines = input.required<(DocumentLine & { receivedQty?: number })[]>();
  readonly totals = input.required<DocumentTotals & { paidAmount?: number }>();
  readonly notes = input<string | undefined | null>();
  readonly showReceived = input(false);
  readonly priceLabel = input('documents.fields.unitPrice');
}
