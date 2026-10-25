import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { FilterTabs } from '../../../shared/components/filter-tabs/filter-tabs';
import { PAYMENT_METHODS, type Payment } from '@erp/shared';
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
import { LocalDatePipe } from '../../../shared/pipes/local-date.pipe';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { PaymentService } from '../payment.service';
import { PaymentDialog, type PaymentDialogData } from './payment-dialog';

@Component({
  selector: 'app-payments-page',
  imports: [ButtonModule, FilterTabs, RouterLink, TranslatePipe, DataTable, DataTableCell, HasPermission, ErrorBanner, PageHeader, LocalDatePipe, MoneyPipe],
  template: `
    <app-page-header title="payments.title" subtitle="payments.subtitle">
      <button pButton type="button" (click)="recordPayment()" *appHasPermission="'payments.create'">
        <span class="material-symbols-outlined" aria-hidden="true">add</span>
        {{ 'payments.add' | translate }}
      </button>
    </app-page-header>

    @if (list.error(); as errorKey) {
      <app-error-banner [message]="errorKey" (retry)="list.reload()" />
    }

    <section class="card p-4 sm:p-5">
      <app-filter-tabs class="mb-3" [options]="methodTabs" [value]="$any(list.filters()['method'] ?? '')" (valueChange)="list.setFilters({ method: $event || undefined })" />
      <app-data-table
        [columns]="columns"
        [data]="list.items()"
        [total]="list.total()"
        [loading]="list.loading()"
        [query]="list.query()"
        (queryChange)="list.query.set($event)"
      >
        <ng-template appCell="number" let-row><span class="num font-semibold">{{ row.number }}</span></ng-template>
        <ng-template appCell="date" let-row>{{ row.date | localDate }}</ng-template>
        <ng-template appCell="invoiceNumber" let-row>
          <a [routerLink]="['/app/sales/invoices', row.invoiceId]" class="num text-primary no-underline hover:underline">{{ row.invoiceNumber }}</a>
        </ng-template>
        <ng-template appCell="method" let-row>{{ 'payments.method.' + row.method | translate }}</ng-template>
        <ng-template appCell="amount" let-row><span class="num font-semibold text-success">{{ row.amount | money }}</span></ng-template>
      </app-data-table>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentsPage {
  private readonly paymentService = inject(PaymentService);
  private readonly dialogs = inject(DialogService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly list = createListState((q) => this.paymentService.getPayments(q), { sort: '-date' });
  protected readonly methodTabs = [{ value: '', labelKey: 'common.all' }, ...PAYMENT_METHODS.map((m) => ({ value: m, labelKey: `payments.method.${m}` }))];

  protected readonly columns: DataTableColumn<Payment>[] = [
    { key: 'number', header: 'payments.fields.number', sortable: true },
    { key: 'date', header: 'payments.fields.date', sortable: true },
    { key: 'customerName', header: 'documents.fields.customer', sortable: true },
    { key: 'invoiceNumber', header: 'payments.fields.invoice', sortable: true },
    { key: 'method', header: 'payments.fields.method' },
    { key: 'reference', header: 'payments.fields.reference', cellClass: 'num' },
    { key: 'amount', header: 'payments.fields.amount', sortable: true, cellClass: 'text-end' },
  ];

  protected recordPayment(): void {
    this.dialogs
      .open<PaymentDialog, PaymentDialogData, Payment>(PaymentDialog, { header: 'payments.add', data: {}, width: '600px' })
      .pipe(filter(Boolean), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.toast.success('payments.recorded');
        this.list.reload();
      });
  }
}
