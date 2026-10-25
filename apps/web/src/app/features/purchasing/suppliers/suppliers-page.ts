import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import type { Supplier } from '@erp/shared';
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
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { SupplierService } from '../supplier.service';
import { SupplierFormDialog, type SupplierFormDialogData } from './supplier-form-dialog/supplier-form-dialog';

@Component({
  selector: 'app-suppliers-page',
  imports: [ButtonModule, TooltipModule, TranslatePipe, DataTable, DataTableCell, HasPermission, ErrorBanner, PageHeader, StatusPill, MoneyPipe],
  template: `
    <app-page-header title="suppliers.title" subtitle="suppliers.subtitle">
      <button pButton type="button" (click)="openForm()" *appHasPermission="'suppliers.create'">
        <span class="material-symbols-outlined" aria-hidden="true">add</span>
        {{ 'suppliers.add' | translate }}
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
          <div class="py-1">
            <p class="m-0 font-semibold text-on-surface">{{ row.name }}</p>
            @if (row.email) {
              <p class="m-0 text-caption text-muted"><span class="num">{{ row.email }}</span></p>
            }
          </div>
        </ng-template>
        <ng-template appCell="balance" let-row>
          <span class="num font-semibold">{{ row.balance | money }}</span>
        </ng-template>
        <ng-template appCell="isActive" let-row>
          <app-status-pill [status]="row.isActive ? 'active' : 'inactive'" />
        </ng-template>
        <ng-template appCell="actions" let-row>
          <div class="flex justify-end gap-1">
            <button pButton [text]="true" [rounded]="true" severity="secondary" type="button" (click)="openForm(row)" tooltipPosition="top" [pTooltip]="'common.edit' | translate" [attr.aria-label]="'common.edit' | translate" *appHasPermission="'suppliers.update'">
              <span class="material-symbols-outlined" aria-hidden="true">edit</span>
            </button>
            <ng-container *appHasPermission="'suppliers.delete'">
              <!-- Same rule as the API: suppliers we still owe can't be deleted. -->
              <span tooltipPosition="top" [pTooltip]="(row.balance !== 0 ? 'suppliers.deleteBlocked' : 'common.delete') | translate">
                <button pButton [text]="true" [rounded]="true" severity="danger" type="button" (click)="delete(row)" [disabled]="row.balance !== 0" [attr.aria-label]="'common.delete' | translate">
                  <span class="material-symbols-outlined" aria-hidden="true">delete</span>
                </button>
              </span>
            </ng-container>
          </div>
        </ng-template>
      </app-data-table>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SuppliersPage {
  private readonly supplierService = inject(SupplierService);
  private readonly dialogs = inject(DialogService);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly list = createListState((q) => this.supplierService.getSuppliers(q), { sort: '-createdAt' });

  protected readonly columns = computed<DataTableColumn<Supplier>[]>(() => {
    this.auth.user();
    const canEdit = this.auth.hasPermission('suppliers.update') || this.auth.hasPermission('suppliers.delete');
    return [
      { key: 'name', header: 'suppliers.fields.name', sortable: true },
      { key: 'phone', header: 'suppliers.fields.phone', sortable: true, cellClass: 'num' },
      { key: 'vatNumber', header: 'suppliers.fields.vatNumber', cellClass: 'num' },
      { key: 'balance', header: 'suppliers.fields.balance', sortable: true, cellClass: 'text-end' },
      { key: 'isActive', header: 'customers.fields.status' },
      ...(canEdit ? [{ key: 'actions', header: 'common.actions', cellClass: 'w-0 text-end' }] : []),
    ];
  });

  protected openForm(supplier?: Supplier): void {
    this.dialogs
      .open<SupplierFormDialog, SupplierFormDialogData, Supplier>(SupplierFormDialog, { header: supplier ? 'suppliers.edit' : 'suppliers.add', data: { supplier }, width: '640px' })
      .pipe(filter(Boolean), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.toast.success(supplier ? 'common.updated' : 'common.created');
        this.list.reload();
      });
  }

  protected delete(supplier: Supplier): void {
    this.dialogs
      .confirm({ titleKey: 'suppliers.deleteTitle', messageKey: 'common.deleteMessage', params: { name: supplier.name }, confirmKey: 'common.delete', danger: true })
      .pipe(
        filter(Boolean),
        switchMap(() => this.supplierService.deleteSupplier(supplier._id)),
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
