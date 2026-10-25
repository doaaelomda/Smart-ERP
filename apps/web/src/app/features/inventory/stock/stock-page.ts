import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { SelectModule } from 'primeng/select';
import { TabsModule } from 'primeng/tabs';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { ActionMenu } from '../../../shared/components/action-menu/action-menu';
import { Field } from '../../../shared/components/field/field';
import { ButtonModule } from 'primeng/button';
import type { StockLevel, StockMovement } from '@erp/shared';
import { catchError, filter, of } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
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
import { LookupService } from '../../../shared/lookups/lookup.service';
import { LocalDatePipe } from '../../../shared/pipes/local-date.pipe';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { QtyPipe } from '../../../shared/pipes/qty.pipe';
import { StockService } from '../stock.service';
import { StockAdjustDialog, type StockDialogData, StockTransferDialog } from './stock-dialogs';

@Component({
  selector: 'app-stock-page',
  imports: [ButtonModule, FormsModule, SelectModule, TabsModule, ToggleSwitchModule, ActionMenu, Field, 
    TranslatePipe,
    DataTable,
    DataTableCell,
    HasPermission,
    ErrorBanner,
    PageHeader,
    StatusPill,
    LocalDatePipe,
    MoneyPipe,
    QtyPipe,
  ],
  templateUrl: './stock-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StockPage {
  private readonly stockService = inject(StockService);
  private readonly dialogs = inject(DialogService);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly warehouses = toSignal(inject(LookupService).getActiveWarehouses().pipe(catchError(() => of([]))), {
    initialValue: [],
  });
  protected readonly tab = signal<'levels' | 'movements'>('levels');
  private readonly translate = inject(TranslateService);
  /** "All warehouses" + active warehouses. */
  protected readonly warehouseOptions = computed(() => [
    { _id: '', name: this.translate.instant('common.all') as string },
    ...this.warehouses(),
  ]);

  protected readonly levels = createListState((q) => this.stockService.getStockLevels(q), { sort: 'productName' });
  protected readonly movements = createListState((q) => this.stockService.getStockMovements(q), { sort: '-createdAt' });

  protected readonly canAdjust = computed(() => !!this.auth.user() && this.auth.hasPermission('stock.adjust'));
  protected readonly canTransfer = computed(() => !!this.auth.user() && this.auth.hasPermission('stock.transfer'));
  protected readonly canChange = computed(() => this.canAdjust() || this.canTransfer());

  protected readonly levelColumns = computed<DataTableColumn<StockLevel>[]>(() => [
    { key: 'productName', header: 'stock.fields.product', sortable: true },
    { key: 'warehouseName', header: 'stock.fields.warehouse', sortable: true },
    { key: 'quantity', header: 'stock.fields.quantity', sortable: true, cellClass: 'text-end' },
    { key: 'avgCost', header: 'products.fields.avgCost', cellClass: 'text-end' },
    { key: 'value', header: 'stock.fields.value', sortable: true, cellClass: 'text-end' },
    ...(this.canChange() ? [{ key: 'actions', header: 'common.actions', cellClass: 'w-0 text-end' }] : []),
  ]);

  protected readonly movementColumns: DataTableColumn<StockMovement>[] = [
    { key: 'createdAt', header: 'stock.fields.date', sortable: true },
    { key: 'productName', header: 'stock.fields.product' },
    { key: 'warehouseName', header: 'stock.fields.warehouse' },
    { key: 'type', header: 'stock.fields.type', sortable: true },
    { key: 'quantity', header: 'stock.fields.quantity', sortable: true, cellClass: 'text-end' },
    { key: 'reason', header: 'stock.fields.reason' },
  ];

  protected setWarehouse(warehouseId: string): void {
    this.levels.setFilters({ warehouseId: warehouseId || undefined });
    this.movements.setFilters({ warehouseId: warehouseId || undefined });
  }

  protected adjustRow(level: StockLevel): () => void {
    return () => this.openAdjust(level);
  }

  protected transferRow(level: StockLevel): () => void {
    return () => this.openTransfer(level);
  }

  protected openAdjust(level?: StockLevel): void {
    this.openDialog(StockAdjustDialog, level);
  }

  protected openTransfer(level?: StockLevel): void {
    this.openDialog(StockTransferDialog, level);
  }

  private openDialog(component: typeof StockAdjustDialog | typeof StockTransferDialog, level?: StockLevel): void {
    this.dialogs
      .open<StockAdjustDialog | StockTransferDialog, StockDialogData, boolean>(component, { header: component === StockAdjustDialog ? 'stock.adjust' : 'stock.transfer', data: { level }, width: '560px' })
      .pipe(filter(Boolean), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.toast.success('stock.saved');
        this.levels.reload();
        this.movements.reload();
      });
  }
}
