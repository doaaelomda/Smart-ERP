import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { ErrorBanner } from '../../../shared/components/error-banner/error-banner';
import { Field } from '../../../shared/components/field/field';
import { fromMinor, toMinor, type Customer, type CustomerInput } from '@erp/shared';
import { finalize } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { errorTranslationKey } from '../../../core/http/api-error';
import { CustomerService } from '../customer.service';

export interface CustomerFormDialogData {
  /** Omit to create a new customer. */
  customer?: Customer;
}

@Component({
  selector: 'app-customer-form-dialog',
  imports: [ReactiveFormsModule, ButtonModule, InputNumberModule, InputTextModule, TextareaModule, ToggleSwitchModule, TranslatePipe, ErrorBanner, Field],
  templateUrl: './customer-form-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerFormDialog {
  private readonly customers = inject(CustomerService);
  protected readonly dialogRef = inject<DynamicDialogRef<CustomerFormDialog>>(DynamicDialogRef);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly currency = inject(AuthService).user()?.tenant.currency ?? 'EGP';

  protected readonly customer = inject<DynamicDialogConfig<CustomerFormDialogData>>(DynamicDialogConfig).data?.customer;
  protected readonly isEdit = !!this.customer;

  protected readonly form = inject(NonNullableFormBuilder).group({
    name: [this.customer?.name ?? '', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
    email: [this.customer?.email ?? '', [Validators.email, Validators.maxLength(254)]],
    phone: [this.customer?.phone ?? '', [Validators.maxLength(30)]],
    vatNumber: [this.customer?.vatNumber ?? '', [Validators.maxLength(30)]],
    address: [this.customer?.address ?? '', [Validators.maxLength(300)]],
    /** Major units in the form; converted to minor units for the API. */
    creditLimit: [fromMinor(this.customer?.creditLimit ?? 0), [Validators.min(0)]],
    notes: [this.customer?.notes ?? '', [Validators.maxLength(1000)]],
    isActive: [this.customer?.isActive ?? true],
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
    const body: CustomerInput = {
      ...value,
      name: value.name.trim(),
      creditLimit: toMinor(Number(value.creditLimit) || 0),
    };
    const request$ = this.customer
      ? this.customers.updateCustomer(this.customer._id, body)
      : this.customers.createCustomer(body);

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
