import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '@ngx-translate/core';
import type { Customer } from '@erp/shared';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { filter, switchMap } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { HasPermission } from '../../core/auth/has-permission.directive';
import { errorTranslationKey } from '../../core/http/api-error';
import { createListState } from '../../core/http/list-state';
import { DialogService } from '../../core/ui/dialog.service';
import { ToastService } from '../../core/ui/toast.service';
import { DataTable } from '../../shared/components/data-table/data-table';
import { DataTableCell } from '../../shared/components/data-table/data-table-cell.directive';
import type { DataTableColumn } from '../../shared/components/data-table/data-table.types';
import { ErrorBanner } from '../../shared/components/error-banner/error-banner';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { StatusPill } from '../../shared/components/status-pill/status-pill';
import { MoneyPipe } from '../../shared/pipes/money.pipe';
import { CustomerService } from './customer.service';
import { CustomerFormDialog, type CustomerFormDialogData } from './customer-form-dialog/customer-form-dialog';

@Component({
  selector: 'app-customers-page',
  imports: [ButtonModule, TooltipModule, TranslatePipe, DataTable, DataTableCell, HasPermission, ErrorBanner, PageHeader, StatusPill, MoneyPipe],
  templateUrl: './customers-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomersPage {
  private readonly customerService = inject(CustomerService);
  private readonly dialogs = inject(DialogService);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly list = createListState((q) => this.customerService.getCustomers(q), { sort: '-createdAt' });

  protected readonly columns = computed<DataTableColumn<Customer>[]>(() => {
    this.auth.user();
    const canEdit = this.auth.hasPermission('customers.update') || this.auth.hasPermission('customers.delete');
    return [
      { key: 'name', header: 'customers.fields.name', sortable: true, skeleton: 'avatar' },
      { key: 'phone', header: 'customers.fields.phone', sortable: true, cellClass: 'num' },
      { key: 'vatNumber', header: 'customers.fields.vatNumber', cellClass: 'num' },
      { key: 'creditLimit', header: 'customers.fields.creditLimit', sortable: true, cellClass: 'text-end' },
      { key: 'balance', header: 'customers.fields.balance', sortable: true, cellClass: 'text-end' },
      { key: 'isActive', header: 'customers.fields.status' },
      ...(canEdit ? [{ key: 'actions', header: 'common.actions', cellClass: 'w-0 text-end' }] : []),
    ];
  });

  protected openForm(customer?: Customer): void {
    this.dialogs
      .open<CustomerFormDialog, CustomerFormDialogData, Customer>(CustomerFormDialog, {
        header: customer ? 'customers.edit' : 'customers.add',
        data: { customer },
        width: '640px',
      })
      .pipe(filter(Boolean), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.toast.success(customer ? 'customers.updated' : 'customers.created');
        if (!customer) this.list.query.update((q) => ({ ...q, page: 1 }));
        this.list.reload();
      });
  }

  protected delete(customer: Customer): void {
    this.dialogs
      .confirm({
        titleKey: 'customers.deleteTitle',
        messageKey: 'customers.deleteMessage',
        params: { name: customer.name },
        confirmKey: 'common.delete',
        danger: true,
      })
      .pipe(
        filter(Boolean),
        switchMap(() => this.customerService.deleteCustomer(customer._id)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.toast.success('customers.deleted');
          this.list.afterDelete();
        },
        error: (err: unknown) => this.toast.error(errorTranslationKey(err)),
      });
  }
}
