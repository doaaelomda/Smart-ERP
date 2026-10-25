import { describe, expect, it } from 'vitest';
import { calcLine, formatMoney, fromMinor, percentOf, toMinor } from './money.js';

describe('money utils', () => {
  it('converts to minor units without float errors', () => {
    expect(toMinor(12.5)).toBe(1250);
    expect(toMinor(0.1 + 0.2)).toBe(30);
    expect(toMinor(1.005)).toBe(101);
    expect(toMinor(-3.335)).toBe(-334);
  });

  it('converts back from minor units', () => {
    expect(fromMinor(1250)).toBe(12.5);
  });

  it('calculates VAT with half-up rounding', () => {
    expect(percentOf(1000, 15)).toBe(150);
    expect(percentOf(333, 15)).toBe(50); // 49.95 -> 50
    expect(percentOf(0, 15)).toBe(0);
  });

  it('formats money for a locale', () => {
    expect(formatMoney(1250, 'SAR', 'en-US')).toContain('12.50');
  });
});

describe('calcLine', () => {
  it('applies discount before VAT and rounds half-up', () => {
    // 3 × 10.05 = 30.15 − 1.00 discount = 29.15; VAT 14% = 4.081 → 4.08
    expect(calcLine(3, 1005, 100, 14)).toEqual({ lineSubtotal: 2915, lineVat: 408, lineTotal: 3323 });
  });

  it('handles fractional quantities and zero VAT', () => {
    expect(calcLine(1.5, 333, 0, 0)).toEqual({ lineSubtotal: 500, lineVat: 0, lineTotal: 500 });
  });
});
