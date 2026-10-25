/**
 * Money is stored as integers in minor units (e.g. halalas: 12.50 SAR -> 1250)
 * to avoid floating point errors in totals and VAT.
 */
export const MINOR_UNITS = 100;

/** Rounds half away from zero, avoiding float artifacts like 1.005 -> 1.00. */
function roundHalfUp(value: number): number {
  const rounded = Math.round(Math.abs(value) + Number.EPSILON);
  return value < 0 ? -rounded : rounded;
}

export function toMinor(amount: number): number {
  return roundHalfUp(Number((amount * MINOR_UNITS).toFixed(6)));
}

export function fromMinor(minor: number): number {
  return minor / MINOR_UNITS;
}

/** Percentage of a minor amount, rounded to the nearest minor unit (used for VAT). */
export function percentOf(minor: number, rate: number): number {
  return roundHalfUp((minor * rate) / 100);
}

export function formatMoney(minor: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(fromMinor(minor));
}

export interface LineAmounts {
  lineSubtotal: number;
  lineVat: number;
  lineTotal: number;
}

/**
 * Invoice/quotation line math (spec 8.2), shared so the UI preview matches the server:
 * subtotal = round(quantity × unitPrice) − discount; VAT on the subtotal; half-up on minor units.
 */
export function calcLine(quantity: number, unitPrice: number, discount: number, vatRate: number): LineAmounts {
  const lineSubtotal = roundHalfUp(quantity * unitPrice) - discount;
  const lineVat = percentOf(lineSubtotal, vatRate);
  return { lineSubtotal, lineVat, lineTotal: lineSubtotal + lineVat };
}
