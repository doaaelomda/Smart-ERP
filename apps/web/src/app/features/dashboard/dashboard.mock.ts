/**
 * DEMO DATA for the dashboard layout. Replaced by the real /dashboard API in Phase 5.
 * Amounts are in minor units (piasters), like the API.
 */
export type InvoiceStatus = 'paid' | 'issued' | 'partially_paid' | 'overdue';

export const DEMO_REVENUE_BY_MONTH = [
  98_000_00, 112_000_00, 104_000_00, 129_000_00, 121_000_00, 143_000_00,
  136_000_00, 158_000_00, 149_000_00, 167_000_00, 164_000_00, 184_520_00,
];

export const DEMO_KPI_BASE = {
  receivables: { value: 43_105_00, delta: -3.1 },
  stockValue: { value: 278_900_00, delta: 5.6 },
  overdue: { value: 7, delta: 2 },
};

export const DEMO_ALERTS = [
  { type: 'lowStock', icon: 'inventory', tile: 'bg-warning-soft text-warning', text: 'ورق تصوير A4 — متبقي 12', link: '/app/inventory/stock', minutes: 10 },
  { type: 'overdue', icon: 'receipt_long', tile: 'bg-danger-soft text-danger', text: 'INV-2026-0142 · النيل للتجارة', link: '/app/sales/invoices', minutes: 65 },
  { type: 'latePo', icon: 'local_shipping', tile: 'bg-info-soft text-info', text: 'PO-2026-0031 · الدلتا للتوريدات', link: '/app/purchasing/orders', minutes: 180 },
  { type: 'lowStock', icon: 'inventory', tile: 'bg-warning-soft text-warning', text: 'حبر HP 305 — متبقي 4', link: '/app/inventory/stock', minutes: 300 },
] as const;

export const DEMO_INVOICES: { number: string; customer: string; total: number; status: InvoiceStatus }[] = [
  { number: 'INV-2026-0158', customer: 'القاهرة للأدوات المكتبية', total: 12_650_00, status: 'paid' },
  { number: 'INV-2026-0157', customer: 'النيل للتجارة', total: 8_452_50, status: 'issued' },
  { number: 'INV-2026-0156', customer: 'كافيه وردة الصحراء', total: 3_128_00, status: 'partially_paid' },
  { number: 'INV-2026-0142', customer: 'مجموعة الإسكندرية للتجزئة', total: 21_400_00, status: 'overdue' },
  { number: 'INV-2026-0141', customer: 'عيادات المعادي', total: 966_00, status: 'paid' },
];

export const DEMO_TOP_PRODUCTS = [
  { name: 'ماوس لاسلكي M220', sold: 342, share: 100 },
  { name: 'ورق تصوير A4 (كرتونة)', sold: 288, share: 84 },
  { name: 'شاحن USB-C ‏65W', sold: 196, share: 57 },
  { name: 'كرسي مكتب أساسي', sold: 121, share: 35 },
];
