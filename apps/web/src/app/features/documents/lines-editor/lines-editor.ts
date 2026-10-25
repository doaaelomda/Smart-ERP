import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { type FormArray, ReactiveFormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { calcLine, fromMinor, type Product, toMinor } from '@erp/shared';
import { map, startWith, switchMap } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { type AutocompleteOption, RemoteAutocomplete } from '../../../shared/components/remote-autocomplete/remote-autocomplete';
import { LookupService } from '../../../shared/lookups/lookup.service';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { createLineForm, type LineForm } from '../document-form';

interface Totals {
  subtotal: number;
  discountTotal: number;
  vatTotal: number;
  total: number;
  lines: number[];
}

/**
 * Editable lines + live totals for invoices, quotations and purchase orders.
 * Uses the same `calcLine` as the API, so the preview matches what will be saved.
 */
@Component({
  selector: 'app-lines-editor',
  imports: [ReactiveFormsModule, ButtonModule, CheckboxModule, InputNumberModule, InputTextModule, TooltipModule, TranslatePipe, RemoteAutocomplete, MoneyPipe],
  templateUrl: './lines-editor.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LinesEditor {
  readonly lines = input.required<FormArray<LineForm>>();
  /** sale: product sale price; purchase: stock products only, average cost as default price. */
  readonly mode = input<'sale' | 'purchase'>('sale');

  private readonly lookups = inject(LookupService);
  private readonly auth = inject(AuthService);

  protected readonly currency = this.auth.user()?.tenant.currency ?? 'EGP';
  protected readonly vatRate = this.auth.user()?.tenant.vatRate ?? 0;
  protected readonly totals = signal<Totals>({ subtotal: 0, discountTotal: 0, vatTotal: 0, total: 0, lines: [] });
  protected readonly searchProducts = computed(() =>
    this.lookups.searchProducts(this.mode() === 'purchase' ? 'stock' : undefined),
  );

  constructor() {
    // Follows the FormArray even when the parent replaces it (edit forms load later).
    toObservable(this.lines)
      .pipe(
        switchMap((lines) => lines.valueChanges.pipe(startWith(null), map(() => lines))),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.totals.set(this.calculate()));
  }

  protected add(): void {
    this.lines().push(createLineForm(undefined, this.mode() === 'purchase'));
  }

  protected remove(index: number): void {
    if (this.lines().length > 1) this.lines().removeAt(index);
  }

  protected onProductSelected(line: LineForm, option: AutocompleteOption): void {
    const product = option.data as Product;
    const price = this.mode() === 'purchase' ? product.avgCost : product.salePrice;
    line.patchValue({
      productLabel: product.name,
      description: product.name,
      unitPrice: fromMinor(price),
      vatApplicable: product.vatApplicable,
    });
  }

  private calculate(): Totals {
    const result: Totals = { subtotal: 0, discountTotal: 0, vatTotal: 0, total: 0, lines: [] };
    for (const l of this.lines().getRawValue()) {
      const qty = Number(l.quantity) || 0;
      const price = toMinor(Number(l.unitPrice) || 0);
      const discount = toMinor(Number(l.discount) || 0);
      const amounts = calcLine(qty, price, discount, l.vatApplicable ? this.vatRate : 0);
      result.subtotal += amounts.lineSubtotal + discount;
      result.discountTotal += discount;
      result.vatTotal += amounts.lineVat;
      result.total += amounts.lineTotal;
      result.lines.push(amounts.lineTotal);
    }
    return result;
  }
}
