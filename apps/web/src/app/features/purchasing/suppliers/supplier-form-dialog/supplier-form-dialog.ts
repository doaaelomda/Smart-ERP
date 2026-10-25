import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { ErrorBanner } from '../../../../shared/components/error-banner/error-banner';
import { Field } from '../../../../shared/components/field/field';
import type { Supplier, SupplierInput } from '@erp/shared';
import { finalize } from 'rxjs';
import { errorTranslationKey } from '../../../../core/http/api-error';
import { SupplierService } from '../../supplier.service';

export interface SupplierFormDialogData {
  /** Omit to create a new supplier. */
  supplier?: Supplier;
}

@Component({
  selector: 'app-supplier-form-dialog',
  imports: [ReactiveFormsModule, ButtonModule, InputTextModule, TextareaModule, ToggleSwitchModule, TranslatePipe, ErrorBanner, Field],
  templateUrl: './supplier-form-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SupplierFormDialog {
  private readonly suppliers = inject(SupplierService);
  protected readonly dialogRef = inject<DynamicDialogRef<SupplierFormDialog>>(DynamicDialogRef);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly supplier = inject<DynamicDialogConfig<SupplierFormDialogData>>(DynamicDialogConfig).data?.supplier;
  protected readonly isEdit = !!this.supplier;

  protected readonly form = inject(NonNullableFormBuilder).group({
    name: [this.supplier?.name ?? '', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
    email: [this.supplier?.email ?? '', [Validators.email, Validators.maxLength(254)]],
    phone: [this.supplier?.phone ?? '', [Validators.maxLength(30)]],
    vatNumber: [this.supplier?.vatNumber ?? '', [Validators.maxLength(30)]],
    address: [this.supplier?.address ?? '', [Validators.maxLength(300)]],
    notes: [this.supplier?.notes ?? '', [Validators.maxLength(1000)]],
    isActive: [this.supplier?.isActive ?? true],
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

    const value = this.form.getRawValue();
    const body: SupplierInput = { ...value, name: value.name.trim() };
    const request$ = this.supplier
      ? this.suppliers.updateSupplier(this.supplier._id, body)
      : this.suppliers.createSupplier(body);

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
