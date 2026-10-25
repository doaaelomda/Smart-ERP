/**
 * Single source of truth for permission keys (`<module>.<action>`).
 * Used by the API (requirePermission) and the web app (PermissionService / directive).
 */
export const PERMISSIONS = {
  users: ['view', 'create', 'update', 'delete'],
  roles: ['view', 'manage'],
  settings: ['view', 'update'],
  customers: ['view', 'create', 'update', 'delete'],
  quotations: ['view', 'create', 'update', 'convert'],
  invoices: ['view', 'create', 'update', 'issue', 'cancel'],
  payments: ['view', 'create'],
  products: ['view', 'create', 'update', 'delete'],
  warehouses: ['view', 'manage'],
  stock: ['view', 'adjust', 'transfer'],
  suppliers: ['view', 'create', 'update', 'delete'],
  purchaseOrders: ['view', 'create', 'update', 'receive', 'cancel'],
  dashboard: ['view'],
  reports: ['view', 'export'],
  audit: ['view'],
} as const;

type PermissionMap = typeof PERMISSIONS;
export type PermissionModule = keyof PermissionMap;

export type Permission = {
  [M in PermissionModule]: `${M}.${PermissionMap[M][number]}`;
}[PermissionModule];

export const ALL_PERMISSIONS: Permission[] = (
  Object.entries(PERMISSIONS) as [PermissionModule, readonly string[]][]
).flatMap(([module, actions]) => actions.map((action) => `${module}.${action}` as Permission));

export const DEFAULT_ROLES = ['Owner', 'Admin', 'Sales', 'Inventory', 'Accountant'] as const;
export type DefaultRole = (typeof DEFAULT_ROLES)[number];
