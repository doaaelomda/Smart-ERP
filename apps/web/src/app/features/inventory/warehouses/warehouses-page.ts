import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import type { Warehouse } from '@erp/shared';
import { filter, switchMap } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { HasPermission } from '../../../core/auth/has-permission.directive';
import { errorTranslationKey } from '../../../core/http/api-error';
import { createListState } from '../../../core/http/list-state';
import { DialogService } from '../../../core/ui/dialog.service';
import { ToastService } from '../../../core/ui/toast.service';
import { DataTable } from '../../../shared/components/data-table/data-table';
import { DataTableCell } from '../../../shared/components/data-table/data-table-cell.directive';
import type { DataTableColumn } from '../../../shared/components/data-table/data-table.types';
import { ErrorBanner } from '../../../shared/components/error-banner/error-banner';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { StatusPill } from '../../../shared/components/status-pill/status-pill';
import { WarehouseService } from '../warehouse.service';
import { WarehouseFormDialog, type WarehouseFormDialogData } from './warehouse-form-dialog/warehouse-form-dialog';

@Component({
  selector: 'app-warehouses-page',
  imports: [ButtonModule, TooltipModule, TranslatePipe, DataTable, DataTableCell, HasPermission, ErrorBanner, PageHeader, StatusPill],
  template: `
    <app-page-header title="warehouses.title" subtitle="warehouses.subtitle">
      <button pButton type="button" (click)="openForm()" *appHasPermission="'warehouses.manage'">
        <span class="material-symbols-outlined" aria-hidden="true">add</span>
        {{ 'warehouses.add' | translate }}
      </button>
    </app-page-header>

    @if (list.error(); as errorKey) {
      <app-error-banner [message]="errorKey" (retry)="list.reload()" />
    }

    <section class="card p-4 sm:p-5">
      <app-data-table
        [columns]="columns()"
        [data]="list.items()"
        [total]="list.total()"
        [loading]="list.loading()"
        [query]="list.query()"
        (queryChange)="list.query.set($event)"
      >
        <ng-template appCell="name" let-row>
          <span class="font-semibold">{{ row.name }}</span>
          @if (row.isDefault) {
            <span class="status-pill ms-2 bg-info-soft text-info">{{ 'warehouses.default' | translate }}</span>
          }
        </ng-template>
        <ng-template appCell="isActive" let-row>
          <app-status-pill [status]="row.isActive ? 'active' : 'inactive'" />
        </ng-template>
        <ng-template appCell="actions" let-row>
          <div class="flex justify-end gap-1">
            <button pButton [text]="true" [rounded]="true" severity="secondary" type="button" (click)="openForm(row)" tooltipPosition="top" [pTooltip]="'common.edit' | translate" [attr.aria-label]="'common.edit' | translate">
              <span class="material-symbols-outlined" aria-hidden="true">edit</span>
            </button>
            <!-- Same rule as the API: the default warehouse can't be deleted (stock is checked on the server). -->
            <span tooltipPosition="top" [pTooltip]="(row.isDefault ? 'warehouses.deleteBlocked' : 'common.delete') | translate">
              <button pButton [text]="true" [rounded]="true" severity="danger" type="button" (click)="delete(row)" [disabled]="row.isDefault" [attr.aria-label]="'common.delete' | translate">
                <span class="material-symbols-outlined" aria-hidden="true">delete</span>
              </button>
            </span>
          </div>
        </ng-template>
      </app-data-table>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WarehousesPage {
  private readonly warehouseService = inject(WarehouseService);
  private readonly dialogs = inject(DialogService);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly list = createListState((q) => this.warehouseService.getWarehouses(q), { sort: 'name' });

  protected readonly columns = computed<DataTableColumn<Warehouse>[]>(() => {
    this.auth.user();
    return [
      { key: 'name', header: 'warehouses.fields.name', sortable: true },
      { key: 'code', header: 'warehouses.fields.code', sortable: true, cellClass: 'num' },
      { key: 'address', header: 'warehouses.fields.address' },
      { key: 'isActive', header: 'customers.fields.status' },
      ...(this.auth.hasPermission('warehouses.manage') ? [{ key: 'actions', header: 'common.actions', cellClass: 'w-0 text-end' }] : []),
    ];
  });

  protected openForm(warehouse?: Warehouse): void {
    this.dialogs
      .open<WarehouseFormDialog, WarehouseFormDialogData, Warehouse>(WarehouseFormDialog, { header: warehouse ? 'warehouses.edit' : 'warehouses.add', data: { warehouse }, width: '560px' })
      .pipe(filter(Boolean), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.toast.success(warehouse ? 'common.updated' : 'common.created');
        this.list.reload();
      });
  }

  protected delete(warehouse: Warehouse): void {
    this.dialogs
      .confirm({ titleKey: 'warehouses.deleteTitle', messageKey: 'common.deleteMessage', params: { name: warehouse.name }, confirmKey: 'common.delete', danger: true })
      .pipe(
        filter(Boolean),
        switchMap(() => this.warehouseService.deleteWarehouse(warehouse._id)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.toast.success('common.deleted');
          this.list.afterDelete();
        },
        error: (err: unknown) => this.toast.error(errorTranslationKey(err)),
      });
  }
}
