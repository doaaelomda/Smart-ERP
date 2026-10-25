import { ALL_PERMISSIONS, type DefaultRole, type Permission } from './permissions.js';

/** Permissions seeded for each default role when a company (tenant) registers. */
export const DEFAULT_ROLE_PERMISSIONS: Record<DefaultRole, Permission[]> = {
  Owner: ALL_PERMISSIONS,
  Admin: ALL_PERMISSIONS,
  Sales: [
    'dashboard.view',
    'customers.view', 'customers.create', 'customers.update',
    'quotations.view', 'quotations.create', 'quotations.update', 'quotations.convert',
    'invoices.view', 'invoices.create', 'invoices.update', 'invoices.issue',
    'payments.view', 'payments.create',
    'products.view', 'stock.view',
  ],
  Inventory: [
    'dashboard.view',
    'products.view', 'products.create', 'products.update', 'products.delete',
    'warehouses.view', 'warehouses.manage',
    'stock.view', 'stock.adjust', 'stock.transfer',
    'suppliers.view', 'suppliers.create', 'suppliers.update',
    'purchaseOrders.view', 'purchaseOrders.create', 'purchaseOrders.update', 'purchaseOrders.receive',
  ],
  Accountant: [
    'dashboard.view',
    'customers.view', 'suppliers.view',
    'invoices.view', 'payments.view', 'payments.create',
    'purchaseOrders.view',
    'reports.view', 'reports.export',
  ],
};

/** The role given to the user who registers the company. */
export const OWNER_ROLE: DefaultRole = 'Owner';
