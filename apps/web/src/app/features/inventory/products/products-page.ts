import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { FilterTabs } from '../../../shared/components/filter-tabs/filter-tabs';
import type { Product } from '@erp/shared';
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
import { QtyPipe } from '../../../shared/pipes/qty.pipe';
import { ProductService } from '../product.service';
import { ProductFormDialog, type ProductFormDialogData } from './product-form-dialog/product-form-dialog';

@Component({
  selector: 'app-products-page',
  imports: [ButtonModule, TooltipModule, FilterTabs, 
    TranslatePipe,
    DataTable,
    DataTableCell,
    HasPermission,
    ErrorBanner,
    PageHeader,
    StatusPill,
    MoneyPipe,
    QtyPipe,
  ],
  templateUrl: './products-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductsPage {
  private readonly productService = inject(ProductService);
  private readonly dialogs = inject(DialogService);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly list = createListState((q) => this.productService.getProducts(q), { sort: '-createdAt' });
  protected readonly typeTabs = [
    { value: '', labelKey: 'common.all' },
    { value: 'stock', labelKey: 'products.type.stock' },
    { value: 'service', labelKey: 'products.type.service' },
  ];

  protected readonly columns = computed<DataTableColumn<Product>[]>(() => {
    this.auth.user();
    const canEdit = this.auth.hasPermission('products.update') || this.auth.hasPermission('products.delete');
    return [
      { key: 'name', header: 'products.fields.name', sortable: true },
      { key: 'sku', header: 'products.fields.sku', sortable: true, cellClass: 'num' },
      { key: 'category', header: 'products.fields.category', sortable: true },
      { key: 'salePrice', header: 'products.fields.salePrice', sortable: true, cellClass: 'text-end' },
      { key: 'avgCost', header: 'products.fields.avgCost', sortable: true, cellClass: 'text-end' },
      { key: 'quantity', header: 'products.fields.quantity', cellClass: 'text-end' },
      { key: 'isActive', header: 'customers.fields.status' },
      ...(canEdit ? [{ key: 'actions', header: 'common.actions', cellClass: 'w-0 text-end' }] : []),
    ];
  });

  protected setType(type: string): void {
    this.list.setFilters({ type: type || undefined });
  }

  protected openForm(product?: Product): void {
    this.dialogs
      .open<ProductFormDialog, ProductFormDialogData, Product>(ProductFormDialog, { header: product ? 'products.edit' : 'products.add', data: { product }, width: '680px' })
      .pipe(filter(Boolean), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.toast.success(product ? 'products.updated' : 'products.created');
        this.list.reload();
      });
  }

  protected delete(product: Product): void {
    this.dialogs
      .confirm({ titleKey: 'products.deleteTitle', messageKey: 'common.deleteMessage', params: { name: product.name }, confirmKey: 'common.delete', danger: true })
      .pipe(
        filter(Boolean),
        switchMap(() => this.productService.deleteProduct(product._id)),
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
