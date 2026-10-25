import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import type { PurchaseOrder } from '@erp/shared';
import { ButtonModule } from 'primeng/button';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { finalize } from 'rxjs';
import { errorTranslationKey } from '../../../core/http/api-error';
import { ErrorBanner } from '../../../shared/components/error-banner/error-banner';
import { QtyPipe } from '../../../shared/pipes/qty.pipe';
import { PurchaseOrderService } from '../purchase-order.service';

export interface ReceiveDialogData {
  order: PurchaseOrder;
}

const round3 = (n: number) => Math.round(n * 1000) / 1000;

/** Goods receipt: quantity received now per line (defaults to everything remaining). */
@Component({
  selector: 'app-receive-dialog',
  imports: [ReactiveFormsModule, ButtonModule, InputNumberModule, TranslatePipe, ErrorBanner, QtyPipe],
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()" novalidate class="flex flex-col gap-4">
      @if (error(); as errorKey) {
        <app-error-banner [message]="errorKey" [retryable]="false" />
      }
      <p class="m-0 text-body text-muted">{{ 'purchaseOrders.receiveHint' | translate }}</p>
      <div class="flex flex-col gap-3">
        @for (line of order.lines; track $index; let i = $index) {
          <div class="grid grid-cols-[1fr_auto] items-center gap-3 rounded-xl border border-border p-3">
            <div class="min-w-0">
              <p class="m-0 truncate font-semibold">{{ line.description }}</p>
              <p class="m-0 text-caption text-muted">
                {{ 'purchaseOrders.receivedOf' | translate: { received: (line.receivedQty | qty), ordered: (line.quantity | qty) } }}
              </p>
            </div>
            <p-inputnumber
              [formControl]="quantities.at(i)"
              [min]="0"
              [max]="remaining[i]"
              [maxFractionDigits]="3"
              locale="en-US"
              inputStyleClass="w-28"
              [ariaLabel]="line.description"
            />
            @if (quantities.at(i).invalid) {
              <p class="col-span-2 m-0 text-caption text-danger">{{ 'purchaseOrders.maxReceive' | translate: { max: (remaining[i] | qty) } }}</p>
            }
          </div>
        }
      </div>
      <div class="flex justify-end gap-2 border-t border-border pt-4">
        <p-button type="button" [label]="'common.cancel' | translate" severity="secondary" [text]="true" [disabled]="saving()" (onClick)="dialogRef.close()" />
        <p-button type="submit" [label]="'purchaseOrders.receive' | translate" [loading]="saving()" />
      </div>
    </form>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReceiveDialog {
  private readonly poService = inject(PurchaseOrderService);
  protected readonly dialogRef = inject<DynamicDialogRef<ReceiveDialog>>(DynamicDialogRef);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly order = inject<DynamicDialogConfig<ReceiveDialogData>>(DynamicDialogConfig).data!.order;

  protected readonly remaining = this.order.lines.map((l) => round3(l.quantity - l.receivedQty));
  protected readonly quantities = new FormArray(
    this.remaining.map((max) => new FormControl<number | null>(max, [Validators.min(0), Validators.max(max)])),
  );
  protected readonly form = new FormGroup({ quantities: this.quantities });

  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  protected submit(): void {
    if (this.quantities.invalid) return;
    const lines = this.quantities
      .getRawValue()
      .map((q, index) => ({ index, quantity: Number(q) || 0 }))
      .filter((l) => l.quantity > 0);
    if (!lines.length) {
      this.error.set('purchaseOrders.nothingToReceive');
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    this.poService
      .receivePurchaseOrder(this.order._id, { lines })
      .pipe(
        finalize(() => this.saving.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (po) => this.dialogRef.close(po),
        error: (err: unknown) => this.error.set(errorTranslationKey(err)),
      });
  }
}
