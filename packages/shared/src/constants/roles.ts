import { ALL_PERMISSIONS, type DefaultRole, type Permission } from './permissions.js';

/** Permissions seeded for each default role when a company (tenant) registers. */
export const DEFAULT_ROLE_PERMISSIONS: Record<DefaultRole, Permission[]> = {
  SuperAdmin: ALL_PERMISSIONS,
  Accountant: [
    'dashboard.view',
    'customers.view', 'suppliers.view',
    'invoices.view', 'payments.view', 'payments.create',
    'purchaseOrders.view',
    'reports.view', 'reports.export',
  ],
};

/** The role given to the user who registers the company. */
export const OWNER_ROLE: DefaultRole = 'SuperAdmin';
