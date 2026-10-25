import type { Route, Routes } from '@angular/router';
import { authGuard, guestGuard, permissionGuard } from './core/auth/auth.guards';
import type { DocumentKind } from './features/documents/document-kinds';

type LoadComponentFn = NonNullable<Route['loadComponent']>;

const loadEditor: LoadComponentFn = () =>
  import('./features/documents/document-editor/document-editor-page').then((m) => m.DocumentEditorPage);

/** list / new / :id / :id/edit for invoices, quotations and purchase orders (`kind` and `id` bind as inputs). */
function documentRoutes(
  path: string,
  kind: DocumentKind,
  permissionModule: 'invoices' | 'quotations' | 'purchaseOrders',
  load: { list: LoadComponentFn; details: LoadComponentFn },
): Routes {
  const view = { permission: `${permissionModule}.view` };
  const edit = { kind, permission: `${permissionModule}.update` };
  return [
    { path, canActivate: [permissionGuard], data: view, loadComponent: load.list, title: 'Smart ERP' },
    { path: `${path}/new`, canActivate: [permissionGuard], data: { kind, permission: `${permissionModule}.create` }, loadComponent: loadEditor, title: 'Smart ERP' },
    { path: `${path}/:id`, canActivate: [permissionGuard], data: view, loadComponent: load.details, title: 'Smart ERP' },
    { path: `${path}/:id/edit`, canActivate: [permissionGuard], data: edit, loadComponent: loadEditor, title: 'Smart ERP' },
  ];
}

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./public/landing/landing').then((m) => m.Landing),
    title: 'Smart ERP',
  },
  {
    path: 'auth',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/auth-layout/auth-layout').then((m) => m.AuthLayout),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'login' },
      {
        path: 'login',
        loadComponent: () => import('./features/auth/login/login-page').then((m) => m.LoginPage),
        title: 'Sign in · Smart ERP',
      },
      {
        path: 'register',
        loadComponent: () => import('./features/auth/register/register-page').then((m) => m.RegisterPage),
        title: 'Create account · Smart ERP',
      },
    ],
  },
  {
    path: 'app',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/shell/shell').then((m) => m.Shell),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard-page').then((m) => m.DashboardPage),
        title: 'Dashboard · Smart ERP',
      },
      {
        path: 'customers',
        canActivate: [permissionGuard],
        data: { permission: 'customers.view' },
        loadComponent: () => import('./features/customers/customers-page').then((m) => m.CustomersPage),
        title: 'Customers · Smart ERP',
      },
      {
        path: 'sales',
        children: [
          ...documentRoutes('invoices', 'invoice', 'invoices', {
            list: () => import('./features/sales/invoices/invoices-page').then((m) => m.InvoicesPage),
            details: () => import('./features/sales/invoices/invoice-details-page').then((m) => m.InvoiceDetailsPage),
          }),
          ...documentRoutes('quotations', 'quotation', 'quotations', {
            list: () => import('./features/sales/quotations/quotations-page').then((m) => m.QuotationsPage),
            details: () => import('./features/sales/quotations/quotation-details-page').then((m) => m.QuotationDetailsPage),
          }),
          {
            path: 'payments',
            canActivate: [permissionGuard],
            data: { permission: 'payments.view' },
            loadComponent: () => import('./features/sales/payments/payments-page').then((m) => m.PaymentsPage),
            title: 'Payments · Smart ERP',
          },
        ],
      },
      {
        path: 'inventory',
        children: [
          {
            path: 'products',
            canActivate: [permissionGuard],
            data: { permission: 'products.view' },
            loadComponent: () => import('./features/inventory/products/products-page').then((m) => m.ProductsPage),
            title: 'Products · Smart ERP',
          },
          {
            path: 'stock',
            canActivate: [permissionGuard],
            data: { permission: 'stock.view' },
            loadComponent: () => import('./features/inventory/stock/stock-page').then((m) => m.StockPage),
            title: 'Stock · Smart ERP',
          },
          {
            path: 'warehouses',
            canActivate: [permissionGuard],
            data: { permission: 'warehouses.view' },
            loadComponent: () => import('./features/inventory/warehouses/warehouses-page').then((m) => m.WarehousesPage),
            title: 'Warehouses · Smart ERP',
          },
        ],
      },
      {
        path: 'purchasing',
        children: [
          {
            path: 'suppliers',
            canActivate: [permissionGuard],
            data: { permission: 'suppliers.view' },
            loadComponent: () => import('./features/purchasing/suppliers/suppliers-page').then((m) => m.SuppliersPage),
            title: 'Suppliers · Smart ERP',
          },
          ...documentRoutes('orders', 'purchaseOrder', 'purchaseOrders', {
            list: () => import('./features/purchasing/orders/purchase-orders-page').then((m) => m.PurchaseOrdersPage),
            details: () =>
              import('./features/purchasing/orders/purchase-order-details-page').then((m) => m.PurchaseOrderDetailsPage),
          }),
        ],
      },
      // Modules not built yet stay inside the shell instead of falling back to the landing page.
      {
        path: '**',
        loadComponent: () =>
          import('./features/coming-soon/coming-soon-page').then((m) => m.ComingSoonPage),
        title: 'Smart ERP',
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
