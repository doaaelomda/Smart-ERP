import { createLineForm, createLinesArray, toLineInputs } from './document-form';

describe('document form', () => {
  it('starts new lines with VAT on and converts money to minor units', () => {
    const lines = createLinesArray();
    expect(lines.at(0).controls.vatApplicable.value).toBe(true);

    lines.at(0).patchValue({ description: ' Consulting ', quantity: 1.5, unitPrice: 10.05, discount: 1 });
    expect(toLineInputs(lines)).toEqual([
      { description: 'Consulting', quantity: 1.5, unitPrice: 1005, discount: 100, vatApplicable: true },
    ]);
  });

  it('keeps existing lines VAT setting and requires a product or a description', () => {
    const noVat = createLineForm({ description: 'Delivery', quantity: 1, unitPrice: 5000, vatRate: 0 });
    expect(noVat.controls.vatApplicable.value).toBe(false);
    expect(noVat.controls.unitPrice.value).toBe(50);

    const empty = createLineForm();
    empty.patchValue({ unitPrice: 10 });
    expect(empty.hasError('itemRequired')).toBe(true);
    empty.patchValue({ productId: 'abc' });
    expect(empty.valid).toBe(true);
  });
});
