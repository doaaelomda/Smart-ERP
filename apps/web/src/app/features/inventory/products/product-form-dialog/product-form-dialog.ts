import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectButtonModule } from 'primeng/selectbutton';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { fromMinor, toMinor, type Product, type ProductInput, type ProductType } from '@erp/shared';
import { finalize } from 'rxjs';
import { AuthService } from '../../../../core/auth/auth.service';
import { errorTranslationKey } from '../../../../core/http/api-error';
import { ErrorBanner } from '../../../../shared/components/error-banner/error-banner';
import { Field } from '../../../../shared/components/field/field';
import { ProductService } from '../../product.service';

export interface ProductFormDialogData {
  product?: Product;
}

@Component({
  selector: 'app-product-form-dialog',
  imports: [ReactiveFormsModule, ButtonModule, InputNumberModule, InputTextModule, SelectButtonModule, ToggleSwitchModule, TranslatePipe, ErrorBanner, Field],
  templateUrl: './product-form-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductFormDialog {
  private readonly products = inject(ProductService);
  protected readonly dialogRef = inject<DynamicDialogRef<ProductFormDialog>>(DynamicDialogRef);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly currency = inject(AuthService).user()?.tenant.currency ?? 'EGP';

  protected readonly product = inject<DynamicDialogConfig<ProductFormDialogData>>(DynamicDialogConfig).data?.product;
  private readonly translate = inject(TranslateService);
  protected readonly typeOptions = (['stock', 'service'] as const).map((value) => ({
    value,
    label: this.translate.instant(`products.type.${value}`) as string,
  }));
  protected readonly isEdit = !!this.product;

  protected readonly form = inject(NonNullableFormBuilder).group({
    type: [(this.product?.type ?? 'stock') as ProductType],
    name: [this.product?.name ?? '', [Validators.required, Validators.minLength(2), Validators.maxLength(150)]],
    sku: [this.product?.sku ?? '', [Validators.required, Validators.maxLength(40)]],
    barcode: [this.product?.barcode ?? '', [Validators.maxLength(40)]],
    category: [this.product?.category ?? '', [Validators.maxLength(60)]],
    unit: [this.product?.unit ?? 'pcs', [Validators.maxLength(20)]],
    salePrice: [fromMinor(this.product?.salePrice ?? 0), [Validators.required, Validators.min(0)]],
    avgCost: [fromMinor(this.product?.avgCost ?? 0), [Validators.min(0)]],
    reorderLevel: [this.product?.reorderLevel ?? (null as number | null), [Validators.min(0)]],
    vatApplicable: [this.product?.vatApplicable ?? true],
    isActive: [this.product?.isActive ?? true],
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

    const v = this.form.getRawValue();
    const isStock = v.type === 'stock';
    const body: ProductInput = {
      type: v.type,
      name: v.name.trim(),
      sku: v.sku.trim(),
      barcode: v.barcode,
      category: v.category,
      unit: v.unit,
      salePrice: toMinor(Number(v.salePrice) || 0),
      vatApplicable: v.vatApplicable,
      isActive: v.isActive,
      reorderLevel: isStock && v.reorderLevel !== null && `${v.reorderLevel}` !== '' ? Number(v.reorderLevel) : null,
      // Average cost is maintained by goods receipts; it's only set when creating.
      ...(this.isEdit ? {} : { avgCost: isStock ? toMinor(Number(v.avgCost) || 0) : 0 }),
    };
    const request$ = this.product ? this.products.updateProduct(this.product._id, body) : this.products.createProduct(body);
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
