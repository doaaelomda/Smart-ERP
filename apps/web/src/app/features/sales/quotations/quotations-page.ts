import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { FilterTabs } from '../../../shared/components/filter-tabs/filter-tabs';
import { QUOTATION_STATUSES, type Quotation } from '@erp/shared';
import { HasPermission } from '../../../core/auth/has-permission.directive';
import { createListState } from '../../../core/http/list-state';
import { DataTable } from '../../../shared/components/data-table/data-table';
import { DataTableCell } from '../../../shared/components/data-table/data-table-cell.directive';
import type { DataTableColumn } from '../../../shared/components/data-table/data-table.types';
import { ErrorBanner } from '../../../shared/components/error-banner/error-banner';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { StatusPill } from '../../../shared/components/status-pill/status-pill';
import { LocalDatePipe } from '../../../shared/pipes/local-date.pipe';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { quotationDisplayStatus } from '../document-status';
import { QuotationService } from '../quotation.service';

@Component({
  selector: 'app-quotations-page',
  imports: [ButtonModule, FilterTabs, RouterLink, TranslatePipe, DataTable, DataTableCell, HasPermission, ErrorBanner, PageHeader, StatusPill, LocalDatePipe, MoneyPipe],
  template: `
    <app-page-header title="quotations.title" subtitle="quotations.subtitle">
      <a pButton routerLink="new" *appHasPermission="'quotations.create'">
        <span class="material-symbols-outlined" aria-hidden="true">add</span>
        {{ 'quotations.new' | translate }}
      </a>
    </app-page-header>

    @if (list.error(); as errorKey) {
      <app-error-banner [message]="errorKey" (retry)="list.reload()" />
    }

    <section class="card p-4 sm:p-5">
      <app-filter-tabs class="mb-3" [options]="statusTabs" [value]="$any(list.filters()['status'] ?? '')" (valueChange)="list.setFilters({ status: $event || undefined })" />
      <app-data-table
        [columns]="columns"
        [data]="list.items()"
        [total]="list.total()"
        [loading]="list.loading()"
        [query]="list.query()"
        (queryChange)="list.query.set($event)"
      >
        <ng-template appCell="number" let-row>
          <a [routerLink]="row._id" class="num whitespace-nowrap font-semibold text-primary no-underline hover:underline">{{ row.number }}</a>
        </ng-template>
        <ng-template appCell="createdAt" let-row>{{ row.createdAt | localDate }}</ng-template>
        <ng-template appCell="validUntil" let-row>{{ row.validUntil | localDate }}</ng-template>
        <ng-template appCell="total" let-row><span class="num font-semibold">{{ row.total | money }}</span></ng-template>
        <ng-template appCell="status" let-row><app-status-pill [status]="displayStatus(row)" /></ng-template>
      </app-data-table>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuotationsPage {
  private readonly quotationService = inject(QuotationService);
  protected readonly list = createListState((q) => this.quotationService.getQuotations(q), { sort: '-createdAt' });
  protected readonly statusTabs = [{ value: '', labelKey: 'common.all' }, ...QUOTATION_STATUSES.map((s) => ({ value: s, labelKey: `status.${s}` }))];
  protected readonly displayStatus = quotationDisplayStatus;

  protected readonly columns: DataTableColumn<Quotation>[] = [
    { key: 'number', header: 'quotations.fields.number', sortable: true },
    { key: 'customerName', header: 'documents.fields.customer', sortable: true },
    { key: 'createdAt', header: 'quotations.fields.date', sortable: true },
    { key: 'validUntil', header: 'documents.fields.validUntil', sortable: true },
    { key: 'total', header: 'documents.totals.total', sortable: true, cellClass: 'text-end' },
    { key: 'status', header: 'customers.fields.status', sortable: true },
  ];
}
