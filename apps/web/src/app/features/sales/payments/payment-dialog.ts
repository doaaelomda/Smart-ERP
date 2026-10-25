import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { fromMinor, type Invoice, PAYMENT_METHODS, toMinor } from '@erp/shared';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { finalize, map } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { errorTranslationKey } from '../../../core/http/api-error';
import { toIsoDate } from '../../../core/utils/date';
import { ErrorBanner } from '../../../shared/components/error-banner/error-banner';
import { Field } from '../../../shared/components/field/field';
import { type AutocompleteOption, RemoteAutocomplete } from '../../../shared/components/remote-autocomplete/remote-autocomplete';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { InvoiceService } from '../invoice.service';
import { PaymentService } from '../payment.service';

export interface PaymentDialogData {
  /** Pre-selected invoice (from the invoice page). */
  invoice?: Pick<Invoice, '_id' | 'number' | 'customerName' | 'total' | 'paidAmount'>;
}

type InvoiceOption = Pick<Invoice, '_id' | 'number' | 'customerName' | 'total' | 'paidAmount'>;

/** Record a full or partial customer payment against an issued invoice. */
@Component({
  selector: 'app-payment-dialog',
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    DatePickerModule,
    InputNumberModule,
    InputTextModule,
    SelectModule,
    TranslatePipe,
    ErrorBanner,
    Field,
    RemoteAutocomplete,
    MoneyPipe,
  ],
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()" novalidate class="flex flex-col gap-4">
      @if (error(); as errorKey) {
        <app-error-banner [message]="errorKey" [retryable]="false" />
      }

      @if (data?.invoice; as inv) {
        <p class="m-0 text-body">
          <span class="num font-semibold">{{ inv.number }}</span> · {{ inv.customerName }}
        </p>
      } @else {
        <app-remote-autocomplete
          formControlName="invoiceId"
          label="payments.fields.invoice"
          placeholder="payments.searchInvoice"
          [search]="searchInvoices"
          (selected)="onInvoiceSelected($event)"
        />
      }

      @if (invoice(); as inv) {
        <div class="grid grid-cols-3 gap-2 rounded-xl bg-surface-container-low p-3 text-caption">
          <div>
            <p class="m-0 text-muted">{{ 'documents.totals.total' | translate }}</p>
            <p class="m-0 font-semibold"><span class="num">{{ inv.total | money }}</span></p>
          </div>
          <div>
            <p class="m-0 text-muted">{{ 'invoices.paid' | translate }}</p>
            <p class="m-0 font-semibold"><span class="num">{{ inv.paidAmount | money }}</span></p>
          </div>
          <div>
            <p class="m-0 text-muted">{{ 'invoices.remaining' | translate }}</p>
            <p class="m-0 font-semibold text-primary"><span class="num">{{ remaining() | money }}</span></p>
          </div>
        </div>
      }

      <div class="grid gap-4 sm:grid-cols-2">
        <app-field label="payments.fields.amount" for="pay-amount" [control]="form.controls.amount" [errors]="{ max: 'payments.maxAmount' }">
          <p-inputnumber inputId="pay-amount" formControlName="amount" [min]="0" [minFractionDigits]="2" [maxFractionDigits]="2" [suffix]="' ' + currency" locale="en-US" [fluid]="true" />
        </app-field>
        <app-field label="payments.fields.method" for="pay-method" [control]="form.controls.method">
          <p-select inputId="pay-method" formControlName="method" [options]="methods" optionLabel="label" optionValue="value" appendTo="body" [fluid]="true" />
        </app-field>
        <app-field label="payments.fields.date" for="pay-date" [control]="form.controls.date">
          <p-datepicker inputId="pay-date" formControlName="date" [maxDate]="today" [showIcon]="true" dateFormat="yy-mm-dd" appendTo="body" [fluid]="true" />
        </app-field>
        <app-field label="payments.fields.reference" for="pay-ref" [control]="form.controls.reference">
          <input pInputText id="pay-ref" formControlName="reference" dir="ltr" class="w-full" />
        </app-field>
        <app-field class="sm:col-span-2" label="documents.fields.notes" for="pay-notes" [control]="form.controls.notes">
          <input pInputText id="pay-notes" formControlName="notes" class="w-full" />
        </app-field>
      </div>

      <div class="flex justify-end gap-2 border-t border-border pt-4">
        <p-button type="button" [label]="'common.cancel' | translate" severity="secondary" [text]="true" [disabled]="saving()" (onClick)="dialogRef.close()" />
        <p-button type="submit" [label]="'payments.record' | translate" [loading]="saving()" />
      </div>
    </form>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentDialog {
  private readonly payments = inject(PaymentService);
  private readonly invoices = inject(InvoiceService);
  protected readonly dialogRef = inject<DynamicDialogRef<PaymentDialog>>(DynamicDialogRef);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly data = inject<DynamicDialogConfig<PaymentDialogData>>(DynamicDialogConfig).data;
  protected readonly currency = inject(AuthService).user()?.tenant.currency ?? 'EGP';
  private readonly translate = inject(TranslateService);
  protected readonly methods = PAYMENT_METHODS.map((value) => ({
    value,
    label: this.translate.instant(`payments.method.${value}`) as string,
  }));
  protected readonly today = new Date();

  protected readonly invoice = signal<InvoiceOption | null>(this.data?.invoice ?? null);
  protected readonly remaining = computed(() => {
    const inv = this.invoice();
    return inv ? inv.total - inv.paidAmount : 0;
  });

  protected readonly form = new FormGroup({
    invoiceId: new FormControl<string | null>(this.data?.invoice?._id ?? null, Validators.required),
    amount: new FormControl<number | null>(this.data?.invoice ? fromMinor(this.data.invoice.total - this.data.invoice.paidAmount) : null, [
      Validators.required,
      Validators.min(0.01),
    ]),
    method: new FormControl(PAYMENT_METHODS[0], { nonNullable: true }),
    date: new FormControl<Date>(new Date(), { nonNullable: true }),
    reference: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(80)] }),
    notes: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(500)] }),
  });

  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  /** Only invoices that can still receive payments. */
  protected readonly searchInvoices = (term: string) =>
    this.invoices.getInvoices({ search: term, open: true, limit: 20, sort: '-issueDate' }).pipe(
      map(({ items }): AutocompleteOption<InvoiceOption>[] =>
        items.map((i) => ({ id: i._id, label: `${i.number} · ${i.customerName}`, sublabel: undefined, data: i })),
      ),
    );

  constructor() {
    this.applyMax();
  }

  protected onInvoiceSelected(option: AutocompleteOption): void {
    const inv = option.data as InvoiceOption;
    this.invoice.set(inv);
    this.form.controls.amount.setValue(fromMinor(inv.total - inv.paidAmount));
    this.applyMax();
  }

  private applyMax(): void {
    const max = fromMinor(this.remaining());
    this.form.controls.amount.setValidators([Validators.required, Validators.min(0.01), ...(max > 0 ? [Validators.max(max)] : [])]);
    this.form.controls.amount.updateValueAndValidity();
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.saving.set(true);
    this.error.set(null);
    this.payments
      .createPayment({
        invoiceId: v.invoiceId!,
        amount: toMinor(Number(v.amount)),
        method: v.method,
        date: toIsoDate(v.date),
        reference: v.reference.trim() || undefined,
        notes: v.notes.trim() || undefined,
      })
      .pipe(
        finalize(() => this.saving.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (payment) => this.dialogRef.close(payment),
        error: (err: unknown) => this.error.set(errorTranslationKey(err)),
      });
  }
}
