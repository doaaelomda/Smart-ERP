import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import type { StockLevel } from '@erp/shared';
import { ButtonModule } from 'primeng/button';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { SelectButtonModule } from 'primeng/selectbutton';
import { catchError, finalize, of } from 'rxjs';
import { errorTranslationKey } from '../../../core/http/api-error';
import { ErrorBanner } from '../../../shared/components/error-banner/error-banner';
import { Field } from '../../../shared/components/field/field';
import { RemoteAutocomplete } from '../../../shared/components/remote-autocomplete/remote-autocomplete';
import { LookupService } from '../../../shared/lookups/lookup.service';
import { StockService } from '../stock.service';

/** Pre-fills the dialog from a stock row. */
export interface StockDialogData {
  level?: StockLevel;
}

const DIALOG_IMPORTS = [
  ReactiveFormsModule,
  ButtonModule,
  InputNumberModule,
  InputTextModule,
  SelectModule,
  SelectButtonModule,
  TranslatePipe,
  ErrorBanner,
  Field,
  RemoteAutocomplete,
];

const ERROR_BOX = `
  @if (error(); as errorKey) {
    <app-error-banner [message]="errorKey" [retryable]="false" />
  }`;

const ACTIONS = `
  <div class="flex justify-end gap-2 border-t border-border pt-4">
    <p-button type="button" [label]="'common.cancel' | translate" severity="secondary" [text]="true" [disabled]="saving()" (onClick)="dialogRef.close()" />
    <p-button type="submit" [label]="'common.save' | translate" [loading]="saving()" />
  </div>`;

/** Increase / decrease stock with a reason (damaged, count correction, opening stock). */
@Component({
  selector: 'app-stock-adjust-dialog',
  imports: DIALOG_IMPORTS,
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()" novalidate class="flex flex-col gap-4">
      ${ERROR_BOX}
      <app-remote-autocomplete formControlName="productId" label="stock.fields.product" [search]="searchProducts" [initialLabel]="data?.level?.productName" />
      <app-field label="stock.fields.warehouse" for="sa-warehouse" [control]="form.controls.warehouseId">
        <p-select inputId="sa-warehouse" formControlName="warehouseId" [options]="warehouses()" optionLabel="name" optionValue="_id" appendTo="body" [fluid]="true" />
      </app-field>
      <p-selectbutton formControlName="direction" [options]="directions" optionLabel="label" optionValue="value" [allowEmpty]="false" />
      <app-field label="stock.fields.quantity" for="sa-qty" [control]="form.controls.quantity">
        <p-inputnumber inputId="sa-qty" formControlName="quantity" [min]="0" [maxFractionDigits]="3" locale="en-US" [fluid]="true" />
      </app-field>
      <app-field label="stock.fields.reason" for="sa-reason" [control]="form.controls.reason">
        <input pInputText id="sa-reason" formControlName="reason" [placeholder]="'stock.reasonPlaceholder' | translate" class="w-full" />
      </app-field>
      ${ACTIONS}
    </form>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StockAdjustDialog {
  private readonly stock = inject(StockService);
  private readonly lookups = inject(LookupService);
  protected readonly dialogRef = inject<DynamicDialogRef<StockAdjustDialog>>(DynamicDialogRef);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly data = inject<DynamicDialogConfig<StockDialogData>>(DynamicDialogConfig).data;

  protected readonly searchProducts = this.lookups.searchProducts('stock');
  protected readonly warehouses = toSignal(this.lookups.getActiveWarehouses().pipe(catchError(() => of([]))), { initialValue: [] });
  private readonly translate = inject(TranslateService);
  protected readonly directions = (['in', 'out'] as const).map((value) => ({
    value,
    label: this.translate.instant(value === 'in' ? 'stock.increase' : 'stock.decrease') as string,
  }));

  protected readonly form = inject(NonNullableFormBuilder).group({
    productId: [this.data?.level?.productId ?? (null as string | null), Validators.required],
    warehouseId: [this.data?.level?.warehouseId ?? '', Validators.required],
    direction: ['in' as 'in' | 'out'],
    quantity: [null as number | null, [Validators.required, Validators.min(0.001)]],
    reason: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(300)]],
  });

  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  constructor() {
    // Default warehouse (listed first) when none was pre-selected.
    effect(() => {
      const first = this.warehouses()[0];
      if (first && !this.form.controls.warehouseId.value) this.form.controls.warehouseId.setValue(first._id);
    });
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const qty = Number(v.quantity);
    this.saving.set(true);
    this.error.set(null);
    this.stock
      .createStockAdjustment({
        productId: v.productId!,
        warehouseId: v.warehouseId,
        quantity: v.direction === 'out' ? -qty : qty,
        reason: v.reason.trim(),
      })
      .pipe(
        finalize(() => this.saving.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => this.dialogRef.close(true),
        error: (err: unknown) => this.error.set(errorTranslationKey(err)),
      });
  }
}

/** Move quantity between two warehouses. */
@Component({
  selector: 'app-stock-transfer-dialog',
  imports: DIALOG_IMPORTS,
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()" novalidate class="flex flex-col gap-4">
      ${ERROR_BOX}
      <app-remote-autocomplete formControlName="productId" label="stock.fields.product" [search]="searchProducts" [initialLabel]="data?.level?.productName" />
      <div class="grid gap-4 sm:grid-cols-2">
        <app-field label="stock.fields.from" for="st-from" [control]="form.controls.fromWarehouseId">
        <p-select inputId="st-from" formControlName="fromWarehouseId" [options]="warehouses()" optionLabel="name" optionValue="_id" appendTo="body" [fluid]="true" />
      </app-field>
        <app-field label="stock.fields.to" for="st-to" [control]="form.controls.toWarehouseId">
        <p-select inputId="st-to" formControlName="toWarehouseId" [options]="warehouses()" optionLabel="name" optionValue="_id" appendTo="body" [fluid]="true" />
      </app-field>
      </div>
      <app-field label="stock.fields.quantity" for="st-qty" [control]="form.controls.quantity">
        <p-inputnumber inputId="st-qty" formControlName="quantity" [min]="0" [maxFractionDigits]="3" locale="en-US" [fluid]="true" />
      </app-field>
      <app-field label="stock.fields.reason" for="st-reason" [control]="form.controls.reason">
        <input pInputText id="st-reason" formControlName="reason" class="w-full" />
      </app-field>
      ${ACTIONS}
    </form>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StockTransferDialog {
  private readonly stock = inject(StockService);
  private readonly lookups = inject(LookupService);
  protected readonly dialogRef = inject<DynamicDialogRef<StockTransferDialog>>(DynamicDialogRef);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly data = inject<DynamicDialogConfig<StockDialogData>>(DynamicDialogConfig).data;

  protected readonly searchProducts = this.lookups.searchProducts('stock');
  protected readonly warehouses = toSignal(this.lookups.getActiveWarehouses().pipe(catchError(() => of([]))), { initialValue: [] });

  protected readonly form = inject(NonNullableFormBuilder).group({
    productId: [this.data?.level?.productId ?? (null as string | null), Validators.required],
    fromWarehouseId: [this.data?.level?.warehouseId ?? '', Validators.required],
    toWarehouseId: ['', Validators.required],
    quantity: [null as number | null, [Validators.required, Validators.min(0.001)]],
    reason: ['', [Validators.maxLength(300)]],
  });

  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    if (v.fromWarehouseId === v.toWarehouseId) {
      this.error.set('stock.sameWarehouse');
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    this.stock
      .createStockTransfer({
        productId: v.productId!,
        fromWarehouseId: v.fromWarehouseId,
        toWarehouseId: v.toWarehouseId,
        quantity: Number(v.quantity),
        reason: v.reason.trim() || undefined,
      })
      .pipe(
        finalize(() => this.saving.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => this.dialogRef.close(true),
        error: (err: unknown) => this.error.set(errorTranslationKey(err)),
      });
  }
}
