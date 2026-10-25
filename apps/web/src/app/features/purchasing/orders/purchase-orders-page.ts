import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { FilterTabs } from '../../../shared/components/filter-tabs/filter-tabs';
import { PURCHASE_ORDER_STATUSES, type PurchaseOrder } from '@erp/shared';
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
import { purchaseOrderDisplayStatus } from '../../sales/document-status';
import { PurchaseOrderService } from '../purchase-order.service';

@Component({
  selector: 'app-purchase-orders-page',
  imports: [ButtonModule, FilterTabs, RouterLink, TranslatePipe, DataTable, DataTableCell, HasPermission, ErrorBanner, PageHeader, StatusPill, LocalDatePipe, MoneyPipe],
  template: `
    <app-page-header title="purchaseOrders.title" subtitle="purchaseOrders.subtitle">
      <a pButton routerLink="new" *appHasPermission="'purchaseOrders.create'">
        <span class="material-symbols-outlined" aria-hidden="true">add</span>
        {{ 'purchaseOrders.new' | translate }}
      </a>
    </app-page-header>

    @if (list.error(); as errorKey) {
      <app-error-banner [message]="errorKey" (retry)="list.reload()" />
    }

    <section class="card p-4 sm:p-5">
      <app-filter-tabs class="mb-3" [options]="statusTabs" [value]="statusFilter()" (valueChange)="setStatus($event)" />
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
        <ng-template appCell="orderDate" let-row>{{ row.orderDate | localDate }}</ng-template>
        <ng-template appCell="expectedDate" let-row>{{ row.expectedDate | localDate }}</ng-template>
        <ng-template appCell="total" let-row><span class="num font-semibold">{{ row.total | money }}</span></ng-template>
        <ng-template appCell="status" let-row><app-status-pill [status]="displayStatus(row)" /></ng-template>
      </app-data-table>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PurchaseOrdersPage {
  private readonly poService = inject(PurchaseOrderService);
  protected readonly list = createListState((q) => this.poService.getPurchaseOrders(q), { sort: '-createdAt' });
  protected readonly statusTabs = [
    { value: '', labelKey: 'common.all' },
    ...PURCHASE_ORDER_STATUSES.map((s) => ({ value: s, labelKey: `status.${s}` })),
    { value: 'late', labelKey: 'status.late' },
  ];
  protected readonly displayStatus = purchaseOrderDisplayStatus;

  protected readonly columns: DataTableColumn<PurchaseOrder>[] = [
    { key: 'number', header: 'purchaseOrders.fields.number', sortable: true },
    { key: 'supplierName', header: 'documents.fields.supplier', sortable: true },
    { key: 'orderDate', header: 'purchaseOrders.fields.orderDate', sortable: true },
    { key: 'expectedDate', header: 'documents.fields.expectedDate', sortable: true },
    { key: 'total', header: 'documents.totals.total', sortable: true, cellClass: 'text-end' },
    { key: 'status', header: 'customers.fields.status', sortable: true },
  ];

  protected statusFilter(): string {
    const f = this.list.filters();
    return f['late'] ? 'late' : ((f['status'] as string | undefined) ?? '');
  }

  protected setStatus(value: string): void {
    this.list.setFilters({ status: value && value !== 'late' ? value : undefined, late: value === 'late' ? true : undefined });
  }
}
