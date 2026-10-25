import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import type { Warehouse } from '@erp/shared';
import { ButtonModule } from 'primeng/button';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { InputTextModule } from 'primeng/inputtext';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { finalize } from 'rxjs';
import { errorTranslationKey } from '../../../../core/http/api-error';
import { ErrorBanner } from '../../../../shared/components/error-banner/error-banner';
import { Field } from '../../../../shared/components/field/field';
import { WarehouseService } from '../../warehouse.service';

export interface WarehouseFormDialogData {
  warehouse?: Warehouse;
}

@Component({
  selector: 'app-warehouse-form-dialog',
  imports: [ReactiveFormsModule, ButtonModule, InputTextModule, ToggleSwitchModule, TranslatePipe, ErrorBanner, Field],
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()" novalidate class="flex flex-col gap-4">
      @if (error(); as errorKey) {
        <app-error-banner [message]="errorKey" [retryable]="false" />
      }
      <div class="grid gap-4 sm:grid-cols-[2fr_1fr]">
        <app-field label="warehouses.fields.name" for="w-name" [control]="form.controls.name">
          <input pInputText id="w-name" formControlName="name" class="w-full" />
        </app-field>
        <app-field label="warehouses.fields.code" for="w-code" [control]="form.controls.code">
          <input pInputText id="w-code" formControlName="code" dir="ltr" class="w-full uppercase" />
        </app-field>
        <app-field class="sm:col-span-2" label="warehouses.fields.address" for="w-address" [control]="form.controls.address">
          <input pInputText id="w-address" formControlName="address" class="w-full" />
        </app-field>
      </div>
      <div class="flex flex-col gap-3">
        <!-- The API keeps exactly one default; the current default can't be switched off here. -->
        <label class="flex items-center gap-3" for="w-default">
          <p-toggleswitch inputId="w-default" formControlName="isDefault" />
          <span class="text-body">{{ 'warehouses.fields.isDefault' | translate }}</span>
        </label>
        @if (warehouse) {
          <label class="flex items-center gap-3" for="w-active">
            <p-toggleswitch inputId="w-active" formControlName="isActive" />
            <span class="text-body">{{ 'warehouses.fields.isActive' | translate }}</span>
          </label>
        }
      </div>
      <div class="flex justify-end gap-2 border-t border-border pt-4">
        <p-button type="button" [label]="'common.cancel' | translate" severity="secondary" [text]="true" [disabled]="saving()" (onClick)="dialogRef.close()" />
        <p-button type="submit" [label]="'common.save' | translate" [loading]="saving()" />
      </div>
    </form>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WarehouseFormDialog {
  private readonly warehouses = inject(WarehouseService);
  protected readonly dialogRef = inject<DynamicDialogRef<WarehouseFormDialog>>(DynamicDialogRef);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly warehouse = inject<DynamicDialogConfig<WarehouseFormDialogData>>(DynamicDialogConfig).data?.warehouse;

  protected readonly form = inject(NonNullableFormBuilder).group({
    name: [this.warehouse?.name ?? '', [Validators.required, Validators.minLength(2), Validators.maxLength(80)]],
    code: [this.warehouse?.code ?? '', [Validators.maxLength(20)]],
    address: [this.warehouse?.address ?? '', [Validators.maxLength(300)]],
    isDefault: [{ value: this.warehouse?.isDefault ?? false, disabled: !!this.warehouse?.isDefault }],
    isActive: [{ value: this.warehouse?.isActive ?? true, disabled: !!this.warehouse?.isDefault }],
  });

  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    const body = { ...this.form.value, name: this.form.getRawValue().name.trim() };
    const request$ = this.warehouse
      ? this.warehouses.updateWarehouse(this.warehouse._id, body)
      : this.warehouses.createWarehouse({ ...body, name: body.name });
    request$
      .pipe(
        finalize(() => this.saving.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (saved) => this.dialogRef.close(saved),
        error: (err: unknown) => this.error.set(errorTranslationKey(err)),
      });
  }
}
