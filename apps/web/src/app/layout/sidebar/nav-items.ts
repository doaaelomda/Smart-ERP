import type { Permission } from '@erp/shared';

export interface NavLink {
  label: string; // translation key
  icon: string; // Material Symbols name
  route: string;
  permission?: Permission;
}

export interface NavGroup {
  label: string;
  links: NavLink[];
}

/** Sidebar navigation. Links are filtered by permission once auth lands (Phase 1). */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'nav.main',
    links: [
      { label: 'nav.dashboard', icon: 'space_dashboard', route: '/app/dashboard', permission: 'dashboard.view' },
    ],
  },
  {
    label: 'nav.sales',
    links: [
      { label: 'nav.customers', icon: 'group', route: '/app/customers', permission: 'customers.view' },
      { label: 'nav.quotations', icon: 'request_quote', route: '/app/sales/quotations', permission: 'quotations.view' },
      { label: 'nav.invoices', icon: 'receipt_long', route: '/app/sales/invoices', permission: 'invoices.view' },
      { label: 'nav.payments', icon: 'payments', route: '/app/sales/payments', permission: 'payments.view' },
    ],
  },
  {
    label: 'nav.inventory',
    links: [
      { label: 'nav.products', icon: 'category', route: '/app/inventory/products', permission: 'products.view' },
      { label: 'nav.stock', icon: 'stacks', route: '/app/inventory/stock', permission: 'stock.view' },
      { label: 'nav.warehouses', icon: 'warehouse', route: '/app/inventory/warehouses', permission: 'warehouses.view' },
    ],
  },
  {
    label: 'nav.purchasing',
    links: [
      { label: 'nav.suppliers', icon: 'local_shipping', route: '/app/purchasing/suppliers', permission: 'suppliers.view' },
      { label: 'nav.purchaseOrders', icon: 'assignment', route: '/app/purchasing/orders', permission: 'purchaseOrders.view' },
    ],
  },
  {
    label: 'nav.reports',
    links: [
      { label: 'nav.reports', icon: 'bar_chart', route: '/app/reports', permission: 'reports.view' },
      { label: 'nav.users', icon: 'manage_accounts', route: '/app/users', permission: 'users.view' },
      { label: 'nav.settings', icon: 'settings', route: '/app/settings', permission: 'settings.view' },
    ],
  },
];
