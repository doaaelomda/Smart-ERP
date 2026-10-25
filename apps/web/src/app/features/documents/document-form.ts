import { type AbstractControl, FormArray, FormControl, FormGroup, type ValidationErrors, Validators } from '@angular/forms';
import { fromMinor, toMinor, type DocumentLine, type DocumentLineInput } from '@erp/shared';

/** One editable line. Money fields are in major units while editing. */
export type LineForm = FormGroup<{
  productId: FormControl<string | null>;
  /** Label shown in the product picker when editing an existing line. */
  productLabel: FormControl<string>;
  description: FormControl<string>;
  quantity: FormControl<number | null>;
  unitPrice: FormControl<number | null>;
  discount: FormControl<number | null>;
  vatApplicable: FormControl<boolean>;
}>;

/** A line needs a product or a description (free-text service line). */
function productOrDescription(group: AbstractControl): ValidationErrors | null {
  const { productId, description } = group.value as { productId: string | null; description: string };
  return productId || description?.trim() ? null : { itemRequired: true };
}

export function createLineForm(line?: Partial<DocumentLine>, requireProduct = false): LineForm {
  return new FormGroup({
    productId: new FormControl<string | null>(line?.productId ?? null, requireProduct ? Validators.required : []),
    productLabel: new FormControl(line?.productId ? line.description ?? '' : '', { nonNullable: true }),
    description: new FormControl(line?.description ?? '', { nonNullable: true, validators: [Validators.maxLength(300)] }),
    quantity: new FormControl<number | null>(line?.quantity ?? 1, [Validators.required, Validators.min(0.001)]),
    unitPrice: new FormControl<number | null>(line?.unitPrice !== undefined ? fromMinor(line.unitPrice) : null, [
      Validators.required,
      Validators.min(0),
    ]),
    discount: new FormControl<number | null>(line?.discount ? fromMinor(line.discount) : 0, [Validators.min(0)]),
    vatApplicable: new FormControl(line?.vatRate !== undefined ? line.vatRate > 0 : true, { nonNullable: true }),
  }, { validators: productOrDescription });
}

export function createLinesArray(lines: Partial<DocumentLine>[] = [], requireProduct = false): FormArray<LineForm> {
  const items = lines.length ? lines : [{}];
  return new FormArray(items.map((l) => createLineForm(l, requireProduct)), [Validators.minLength(1)]);
}

/** Form lines → API body (minor units). The server recalculates every amount. */
export function toLineInputs(lines: FormArray<LineForm>): DocumentLineInput[] {
  return lines.getRawValue().map((l) => ({
    ...(l.productId ? { productId: l.productId } : {}),
    description: l.description.trim(),
    quantity: Number(l.quantity),
    unitPrice: toMinor(Number(l.unitPrice) || 0),
    discount: toMinor(Number(l.discount) || 0),
    vatApplicable: l.vatApplicable,
  }));
}
