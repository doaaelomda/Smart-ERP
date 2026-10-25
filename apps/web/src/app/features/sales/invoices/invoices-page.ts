import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { FilterTabs } from '../../../shared/components/filter-tabs/filter-tabs';
import type { Invoice } from '@erp/shared';
import { filter } from 'rxjs';
import { HasPermission } from '../../../core/auth/has-permission.directive';
import { createListState } from '../../../core/http/list-state';
import { DialogService } from '../../../core/ui/dialog.service';
import { ToastService } from '../../../core/ui/toast.service';
import { DataTable } from '../../../shared/components/data-table/data-table';
import { DataTableCell } from '../../../shared/components/data-table/data-table-cell.directive';
import type { DataTableColumn } from '../../../shared/components/data-table/data-table.types';
import { ErrorBanner } from '../../../shared/components/error-banner/error-banner';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { StatusPill } from '../../../shared/components/status-pill/status-pill';
import { LocalDatePipe } from '../../../shared/pipes/local-date.pipe';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { invoiceDisplayStatus } from '../document-status';
import { InvoiceService } from '../invoice.service';
import { PaymentDialog, type PaymentDialogData } from '../payments/payment-dialog';

const FILTERS = ['all', 'draft', 'issued', 'partially_paid', 'paid', 'overdue', 'cancelled'] as const;

@Component({
  selector: 'app-invoices-page',
  imports: [ButtonModule, FilterTabs, 
    RouterLink,
    TranslatePipe,
    DataTable,
    DataTableCell,
    HasPermission,
    ErrorBanner,
    PageHeader,
    StatusPill,
    LocalDatePipe,
    MoneyPipe,
  ],
  template: `
    <app-page-header title="invoices.title" subtitle="invoices.subtitle">
      <button pButton [outlined]="true" type="button" (click)="recordPayment()" *appHasPermission="'payments.create'">
        <span class="material-symbols-outlined" aria-hidden="true">payments</span>
        {{ 'payments.add' | translate }}
      </button>
      <a pButton routerLink="new" *appHasPermission="'invoices.create'">
        <span class="material-symbols-outlined" aria-hidden="true">add</span>
        {{ 'invoices.new' | translate }}
      </a>
    </app-page-header>

    @if (list.error(); as errorKey) {
      <app-error-banner [message]="errorKey" (retry)="list.reload()" />
    }

    <section class="card p-4 sm:p-5">
      <app-filter-tabs class="mb-3" [options]="filterTabs" [value]="statusFilter()" (valueChange)="setStatus($any($event))" />
      <app-data-table
        [columns]="columns"
        [data]="list.items()"
        [total]="list.total()"
        [loading]="list.loading()"
        [query]="list.query()"
        (queryChange)="list.query.set($event)"
      >
        <ng-template appCell="number" let-row>
          <a [routerLink]="row._id" class="num whitespace-nowrap font-semibold text-primary no-underline hover:underline">
            {{ row.number ?? ('status.draft' | translate) }}
          </a>
        </ng-template>
        <ng-template appCell="issueDate" let-row>{{ row.issueDate | localDate }}</ng-template>
        <ng-template appCell="dueDate" let-row>{{ row.dueDate | localDate }}</ng-template>
        <ng-template appCell="total" let-row><span class="num font-semibold">{{ row.total | money }}</span></ng-template>
        <ng-template appCell="remaining" let-row>
          <span class="num">{{ row.status === 'cancelled' || row.status === 'draft' ? '—' : (row.total - row.paidAmount | money) }}</span>
        </ng-template>
        <ng-template appCell="status" let-row><app-status-pill [status]="displayStatus(row)" /></ng-template>
      </app-data-table>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvoicesPage {
  private readonly invoiceService = inject(InvoiceService);
  private readonly dialogs = inject(DialogService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly list = createListState((q) => this.invoiceService.getInvoices(q), { sort: '-createdAt' });
  protected readonly filterTabs = FILTERS.map((f) => ({ value: f, labelKey: f === 'all' ? 'common.all' : `status.${f}` }));
  protected readonly displayStatus = invoiceDisplayStatus;

  protected readonly columns: DataTableColumn<Invoice>[] = [
    { key: 'number', header: 'invoices.fields.number', sortable: true },
    { key: 'customerName', header: 'documents.fields.customer', sortable: true },
    { key: 'issueDate', header: 'invoices.fields.issueDate', sortable: true },
    { key: 'dueDate', header: 'documents.fields.dueDate', sortable: true },
    { key: 'total', header: 'documents.totals.total', sortable: true, cellClass: 'text-end' },
    { key: 'remaining', header: 'invoices.remaining', cellClass: 'text-end' },
    { key: 'status', header: 'customers.fields.status', sortable: true },
  ];

  protected statusFilter(): string {
    const f = this.list.filters();
    return f['overdue'] ? 'overdue' : ((f['status'] as string | undefined) ?? 'all');
  }

  protected setStatus(value: (typeof FILTERS)[number]): void {
    this.list.setFilters({
      status: value === 'all' || value === 'overdue' ? undefined : value,
      overdue: value === 'overdue' ? true : undefined,
    });
  }

  protected recordPayment(): void {
    this.dialogs
      .open<PaymentDialog, PaymentDialogData, unknown>(PaymentDialog, { header: 'payments.add', data: {}, width: '600px' })
      .pipe(filter(Boolean), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.toast.success('payments.recorded');
        this.list.reload();
      });
  }
}
