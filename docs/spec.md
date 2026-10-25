# Smart ERP — Technical Specification

| Field | Value |
|---|---|
| Related | `smart-erp-prd.md` |
| Version | 1.0 (MVP) |
| Date | 2026-10-24 |

---

## 1. Tech Stack

| Layer | Choice |
|---|---|
| Monorepo | npm workspaces (`apps/web`, `apps/api`, `packages/shared`) |
| Frontend | Angular 22 standalone, zoneless, signals, PrimeNG 22 + Tailwind CSS (tailwindcss-primeui), ngx-translate, ngx-echarts |
| Backend | Node.js 22 LTS, Express 5, TypeScript 6 |
| DB | MongoDB (local Docker replica set / Atlas), Mongoose 9 |
| Validation | Zod 4 |
| Auth | jsonwebtoken, bcrypt, httpOnly refresh cookie |
| PDF / QR | pdfmake (Arabic font embedded) / `qrcode` |
| Jobs | node-cron (alerts, daily insights) |
| Logging | pino + pino-http |
| Tests | Vitest + Supertest (api, shared), Vitest via Angular unit-test builder (web); mongodb-memory-server (replica set) from Phase 1 |
| CI | GitHub Actions |

---

## 2. Repository Structure

```
smart-erp/
├─ apps/
│  ├─ api/
│  │  └─ src/
│  │     ├─ config/            # env (zod-validated), db, logger
│  │     ├─ core/
│  │     │  ├─ errors/         # AppError, error codes
│  │     │  ├─ middlewares/    # auth, tenant, requirePermission, validate, errorHandler, rateLimit
│  │     │  └─ utils/          # listQuery builder, money, transaction helper
│  │     ├─ plugins/           # tenantPlugin, softDeletePlugin, auditPlugin
│  │     ├─ jobs/              # alerts.job.ts, insights.job.ts
│  │     ├─ modules/<feature>/ # routes, controller, service, model, validation
│  │     ├─ app.ts
│  │     └─ server.ts
│  └─ web/
│     └─ src/app/
│        ├─ core/              # interceptors, guards, services (Auth, Language, Permission, Notification)
│        ├─ shared/            # data-table, skeleton, form fields, confirm dialog, pipes, directives
│        ├─ layout/            # shell, sidebar, header
│        ├─ public/            # landing page (prerendered)
│        └─ features/          # auth, dashboard, customers, sales, inventory, purchasing, settings, users, super-admin
└─ packages/shared/            # enums, permission keys, zod schemas, DTO types
```

---

## 3. Environment Variables (`apps/api/.env`)

```
NODE_ENV=development
PORT=4000
MONGO_URI=mongodb+srv://...
JWT_ACCESS_SECRET=...
JWT_ACCESS_TTL=15m
JWT_REFRESH_SECRET=...
JWT_REFRESH_TTL=7d
CLIENT_URL=http://localhost:4200
EMAIL_API_KEY=...
CLOUDINARY_URL=...
```
Validated at startup with Zod; the app exits if invalid.

---

## 4. Request Pipeline

```
helmet → cors → json → pino-http → rateLimit(auth routes)
  → authenticate        (verify access JWT → req.user = { id, tenantId, roleId, permissions, isSuperAdmin })
  → tenantContext       (AsyncLocalStorage store { tenantId, userId }; rejects suspended tenants)
  → requirePermission('invoices.create')
  → validate(zodSchema) (body / query / params)
  → controller → service → model
  → errorHandler        (maps AppError / ZodError / Mongo errors → standard error JSON)
```

### 4.1 Tenant Isolation
- `tenantPlugin` (Mongoose): adds `tenantId` (indexed, required); in `pre('find'|'findOne'|'countDocuments'|'aggregate'|'updateOne'|...)` injects `{ tenantId }` from AsyncLocalStorage; in `pre('save')` sets it.
- `tenantId` is **never** read from request body/query.
- Super Admin routes (`/api/v1/admin/*`) explicitly bypass via `{ skipTenant: true }` query option.
- Integration test suite: create 2 tenants, assert no endpoint returns the other tenant's data.

### 4.2 Auth Flow (implemented)
Env: `JWT_ACCESS_SECRET` (min 32 chars), `JWT_ACCESS_TTL_SECONDS` (900), `REFRESH_TOKEN_TTL_DAYS` (7), `BCRYPT_ROUNDS` (12).
Refresh tokens are opaque random values (only a SHA-256 hash is stored, TTL index), cookie `erp_rt`.

1. `POST /auth/login` → returns `{ accessToken, user }`; sets `refreshToken` httpOnly, `Secure`, `SameSite=Strict` cookie.
2. Refresh tokens stored hashed in `refreshTokens` collection (`userId, tokenHash, expiresAt, revokedAt, replacedBy`).
3. `POST /auth/refresh` → rotates token; reuse of a revoked token revokes the whole family.
4. `POST /auth/logout` → revokes current token, clears cookie.
5. Angular `authInterceptor` attaches access token; on 401 performs a single shared refresh (queued requests), then retries.

### 4.3 RBAC
Permission keys (in `packages/shared/permissions.ts`), format `<module>.<action>`:

```
users.view users.create users.update users.delete
roles.view roles.manage
settings.view settings.update
customers.view customers.create customers.update customers.delete
quotations.view quotations.create quotations.update quotations.convert
invoices.view invoices.create invoices.update invoices.issue invoices.cancel
payments.view payments.create
products.view products.create products.update products.delete
warehouses.view warehouses.manage
stock.view stock.adjust stock.transfer
suppliers.view suppliers.create suppliers.update suppliers.delete
purchaseOrders.view purchaseOrders.create purchaseOrders.update purchaseOrders.receive purchaseOrders.cancel
dashboard.view reports.view reports.export audit.view
```
- `Owner` role = all permissions, cannot be deleted/edited.
- Frontend: `PermissionService.has(key)` (signal-based) + `*appHasPermission` directive + route `permissionGuard`. Backend is the source of truth.
- Document responses include `allowedActions` (e.g. `["issue","cancel"]`) computed from status + permissions, so the UI shows/disables buttons from the backend.

---

## 5. API Conventions

- Base: `/api/v1`. JSON only. Dates ISO 8601 UTC.
- Success: `{ "success": true, "data": ..., "meta"?: {...} }`
- Error: `{ "success": false, "error": { "code", "message", "details"? } }`
- Error codes: `VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `INSUFFICIENT_STOCK`, `INVALID_STATUS_TRANSITION`, `TENANT_SUSPENDED`, `RATE_LIMITED`, `INTERNAL_ERROR`.
- `Accept-Language: ar|en` → localized error messages.

### 5.1 List Query (all list endpoints)
| Param | Example | Notes |
|---|---|---|
| `page` | `1` | default 1 |
| `limit` | `20` | default 20, max 100 |
| `search` | `acme` | regex on whitelisted fields (or text index) |
| `sort` | `-createdAt,name` | whitelisted fields only |
| filters | `status=issued&from=2026-01-01&to=2026-01-31` | per-module whitelist |

Response `meta: { page, limit, total, totalPages }`. Implemented once in `core/utils/listQuery.ts`.

---

## 6. Endpoints (MVP)

| Module | Endpoints |
|---|---|
| Auth | `POST /auth/register` · `POST /auth/login` · `POST /auth/refresh` · `POST /auth/logout` · `POST /auth/forgot-password` · `POST /auth/reset-password` · `POST /auth/accept-invite` · `GET /auth/me` |
| Users | `GET/POST /users` · `GET/PATCH/DELETE /users/:id` · `POST /users/invite` · `PATCH /users/:id/status` |
| Roles | `GET/POST /roles` · `GET/PATCH/DELETE /roles/:id` · `GET /roles/permissions` |
| Settings | `GET/PATCH /settings` · `POST /settings/logo` |
| Customers | `GET/POST /customers` · `GET/PATCH/DELETE /customers/:id` · `GET /customers/:id/statement` |
| Quotations | `GET/POST /quotations` · `GET/PATCH /quotations/:id` · `POST /quotations/:id/send` · `POST /quotations/:id/convert` |
| Invoices | `GET/POST /invoices` · `GET/PATCH /invoices/:id` · `POST /invoices/:id/issue` · `POST /invoices/:id/cancel` · `GET /invoices/:id/pdf` |
| Payments | `GET/POST /payments` · `GET /payments/:id` |
| Products | `GET/POST /products` · `GET/PATCH/DELETE /products/:id` · `GET /products/:id/stock` |
| Categories / Units | `GET/POST /categories` · `PATCH/DELETE /categories/:id` · same for `/units` |
| Warehouses | `GET/POST /warehouses` · `PATCH/DELETE /warehouses/:id` |
| Stock | `GET /stock/levels` · `GET /stock/movements` · `POST /stock/adjustments` · `POST /stock/transfers` |
| Suppliers | `GET/POST /suppliers` · `GET/PATCH/DELETE /suppliers/:id` |
| Purchase Orders | `GET/POST /purchase-orders` · `GET/PATCH /purchase-orders/:id` · `POST /purchase-orders/:id/send` · `POST /purchase-orders/:id/receive` · `POST /purchase-orders/:id/cancel` |
| Dashboard | `GET /dashboard/kpis?from&to` · `GET /dashboard/charts/revenue` · `/top-products` · `/top-customers` · `/sales-by-category` |
| Notifications | `GET /notifications` · `PATCH /notifications/:id/read` · `PATCH /notifications/read-all` |
| Reports | `GET /reports/sales` · `/stock-valuation` · `/receivables-aging` (`?format=xlsx|pdf`) |
| Audit | `GET /audit-logs` |
| Super Admin | `GET /admin/tenants` · `GET /admin/tenants/:id` · `PATCH /admin/tenants/:id/status` · `GET /admin/stats` |

---

## 7. Data Model Details

Common fields on tenant documents: `tenantId`, `createdBy`, `updatedBy`, `createdAt`, `updatedAt`, `isDeleted`, `deletedAt`.

### 7.1 Money
- Stored as **integers in minor units** (piasters) to avoid float errors: `12.50 EGP → 1250`.
- `packages/shared/money.ts`: `toMinor`, `fromMinor`, `formatMoney(locale, currency)`.

### 7.2 Schemas & Indexes

```ts
// products
{ type: 'stock'|'service', sku, barcode?, name: { ar, en }, categoryId, unitId,
  salePrice, avgCost, vatApplicable: boolean, reorderLevel?: number, imageUrl?, isActive }
// indexes: {tenantId, sku} unique · {tenantId, barcode} unique sparse · text(name.ar, name.en, sku)

// stockLevels
{ productId, warehouseId, quantity }
// index: {tenantId, productId, warehouseId} unique

// stockMovements (append-only)
{ productId, warehouseId, type: 'IN'|'OUT'|'TRANSFER_IN'|'TRANSFER_OUT'|'ADJUSTMENT',
  quantity, unitCost, refType: 'invoice'|'goodsReceipt'|'adjustment'|'transfer'|'invoiceCancel', refId, reason? }
// index: {tenantId, productId, createdAt:-1}

// invoices
{ number?, customerId, warehouseId, status: 'draft'|'issued'|'partially_paid'|'paid'|'cancelled',
  issueDate?, dueDate, lines: [{ productId, productType, description, quantity, unitPrice,
  discount, vatRate, lineSubtotal, lineVat, lineTotal, unitCost }],
  subtotal, discountTotal, vatTotal, total, paidAmount, notes, qrCode?, cancelledReason? }
// indexes: {tenantId, number} unique sparse · {tenantId, status, dueDate} · {tenantId, customerId, issueDate:-1}

// counters
{ key: 'invoice:2026', seq }   // index {tenantId, key} unique
```

Other collections follow the PRD data model table.

---

## 8. Business Logic

### 8.1 Status Machines
```
Invoice:  draft ─issue→ issued ─pay→ partially_paid ─pay→ paid
          draft ─delete(soft)
          issued ─cancel→ cancelled   (only if paidAmount = 0)
PO:       draft ─send→ sent ─receive→ partially_received ─receive→ received
          draft|sent ─cancel→ cancelled
Quotation: draft ─send→ sent ─accept/reject→ accepted|rejected ; sent ─(validUntil passed)→ expired
           accepted ─convert→ (creates draft invoice)
```
Invalid transitions → `409 INVALID_STATUS_TRANSITION`.

### 8.2 Totals & VAT (per line, then summed)
```
lineSubtotal = round(quantity × unitPrice) − discount
lineVat      = vatApplicable ? round(lineSubtotal × vatRate / 100) : 0
lineTotal    = lineSubtotal + lineVat
```
- Rounding: half-up on minor units. Totals always recalculated on the server; client values ignored.
- `vatRate` copied from tenant settings onto each line at creation (historical accuracy).

### 8.3 Issue Invoice (transaction)
```
withTransaction(session):
  1. load invoice (status must be draft) 
  2. for each stock line: findOneAndUpdate stockLevels
       { tenantId, productId, warehouseId, quantity: { $gte: qty } }, { $inc: { quantity: -qty } }
     → null result ⇒ throw INSUFFICIENT_STOCK (details: productId, available)
  3. insert stockMovements (OUT, unitCost = product.avgCost); store unitCost on line
  4. number = nextSequence('invoice:<year>') → INV-2026-0001
  5. generate QR (8.5); set status=issued, issueDate=now
  6. $inc customer.balance by total
  7. audit log
```
Service lines skip steps 2–3.

### 8.4 Cancel Invoice / Goods Receipt / Payment
- **Cancel:** reverse stock (IN movements with `refType: invoiceCancel`), decrement customer balance, status=cancelled — one transaction.
- **Goods receipt:** per line, in a transaction:
  `newAvg = (oldQtyAllWarehouses × oldAvg + receivedQty × unitCost) / (oldQtyAllWarehouses + receivedQty)`;
  `$inc` stock level (upsert), insert IN movement, update `product.avgCost`, update PO line `receivedQty` and PO status.
- **Payment:** `amount ≤ total − paidAmount`; update `paidAmount`, status, customer balance — one transaction.

### 8.5 Invoice QR
TLV encode → Base64 → QR image (data URL), fields:
1. Seller name · 2. VAT number · 3. Timestamp (ISO) · 4. Invoice total (with VAT) · 5. VAT total.
Note in UI/README: not an official ETA (Egyptian Tax Authority) e-invoice integration.

### 8.6 Sequences
`counters.findOneAndUpdate({ tenantId, key }, { $inc: { seq: 1 } }, { upsert: true, new: true, session })`. Format: `{prefix}-{year}-{seq padded 4}`; prefix from settings.

---

## 9. Dashboard, Alerts & Insights

### 9.1 KPIs (aggregation pipelines, tenant-filtered)
| KPI | Source |
|---|---|
| Revenue today / month | `invoices` status ∈ issued/partially_paid/paid, sum `total` by `issueDate` |
| Receivables | sum `total − paidAmount` of open invoices |
| Payables | sum open supplier bills (P1) / received POs value |
| Stock value | Σ `stockLevels.quantity × product.avgCost` |
| Overdue invoices | count open with `dueDate < now` |
| % change | same metric over previous equal period |

Cached in memory (LRU, 60s TTL, key `tenantId:metric:range`); invalidated on invoice/payment/receipt events.

### 9.2 Alerts Job (node-cron, hourly)
- Low stock: `quantity ≤ reorderLevel` → notification to users with `stock.view` (deduplicated: one active alert per product until resolved).
- Overdue invoices: daily at 08:00 tenant time → users with `invoices.view`.
- Late POs: `expectedDate < now` and not fully received.

### 9.3 Insights Job (daily)
Rule-based, stored in `insights` collection, shown on dashboard:
- Product sales change ≥ ±30% vs previous 30 days.
- Customer balance > credit limit.
- Dead stock: no OUT movement in 90 days with quantity > 0.
- Top growing customer this month.

---

## 10. Frontend Specification

### 10.1 App Setup
- `provideZonelessChangeDetection()`, `provideHttpClient(withFetch(), withInterceptors([...]))`, `provideRouter(routes, withComponentInputBinding())`.
- Rendering: `outputMode: 'server'` with route-level render modes — `/` (landing) `Prerender`, everything else `Client`.

### 10.2 Routing
```
/                     landing (public, prerendered)
/auth/login | /register | /forgot-password | /reset-password | /accept-invite
/app                  shell (authGuard)
  /dashboard
  /customers, /customers/:id
  /sales/quotations, /sales/invoices, /sales/invoices/new, /sales/invoices/:id, /sales/payments
  /inventory/products, /inventory/stock, /inventory/movements, /inventory/warehouses
  /purchasing/suppliers, /purchasing/orders, /purchasing/orders/:id
  /reports, /settings/company, /settings/users, /settings/roles, /settings/audit
/admin                super admin (superAdminGuard)
```
All feature routes lazy loaded (`loadChildren` / `loadComponent`) + `permissionGuard` with `data: { permission }`.

### 10.3 Core Services
| Service | Responsibility |
|---|---|
| `AuthService` | login/logout/refresh, `currentUser` signal |
| `PermissionService` | `has(key)`, `permissions` signal |
| `LanguageService` | current lang signal, sets `<html dir lang>`, persists choice, used by all `dir` bindings |
| `NotificationService` | toasts/alerts (incl. top "copied successfully") |
| `TenantSettingsService` | currency, VAT, locale formatting |

Interceptors: `authInterceptor` (token + refresh queue), `languageInterceptor` (`Accept-Language`), `errorInterceptor` (maps error codes to translated toasts).

### 10.4 Shared Components
- `DataTableComponent<T>`: columns config, server-side search (debounced 300ms), sort, pagination, filters, empty/loading (shared skeleton) states, row actions driven by `allowedActions`. Query state synced to URL query params.
- `ListQuery` model + `toHttpParams()` helper shared by every feature data service.
- Form field wrapper `app-field` (PrimeNG inputs + Tailwind), `MoneyInputComponent`, `ProductPickerComponent` (async search), `ConfirmDialogComponent`, `StatusBadgeComponent`.
- Pipes: `money`, `localizedDate`, `localizedName` (picks `name.ar`/`name.en`).

### 10.5 Conventions
- Feature data services named by entity: `getInvoices`, `getInvoiceById`, `issueInvoice`.
- Every subscription uses `takeUntilDestroyed()` (or signals / `toSignal`).
- Reactive typed forms; invoice line totals computed with `computed()` for preview only (server is authoritative).
- Typography, color, and spacing via Tailwind theme tokens; PrimeNG preset (core/theme/primeng-preset.ts) shares the same tokens; RTL handled with logical properties (`ms-*`, `me-*`, `ps-*`).
- Charts: ngx-echarts, theme follows light/dark + RTL axis direction.

---

## 11. Security Checklist
- bcrypt (cost 12); password policy min 8 chars, letters + numbers.
- Rate limit: login/forgot-password 5 req/min/IP.
- helmet, strict CORS (`CLIENT_URL`), `express-mongo-sanitize`-equivalent input sanitization (strip `$`/`.` keys).
- Zod validation on every body/query/param; whitelisted sort/filter fields.
- File uploads: type + size limits (images ≤ 2MB).
- No stack traces in production responses.

---

## 12. Testing Strategy
| Level | Scope |
|---|---|
| Unit (api) | totals/VAT calc, avg cost, money utils, status transitions, listQuery builder |
| Integration (api) | each module's routes with Supertest; transactional flows (issue/cancel invoice, receive PO, insufficient stock rollback); tenant isolation suite; RBAC 403 cases |
| Unit (web) | services, interceptors (refresh queue), DataTable, permission directive |
| E2E (optional, P2) | Playwright: sign up → create product → receive stock → issue invoice → pay |

Seed script: `npm run seed` creates a demo tenant with 50 products, 30 customers, 12 months of invoices for dashboard charts.

---

## 13. CI / CD
- GitHub Actions on PR: install → lint → typecheck → test (api + web) → build.
- On `main`: deploy web (Vercel/Netlify) and api (Render/Railway); Atlas as DB.
- Conventional commits; `README` with architecture diagram, ERD, setup, demo credentials.

---

## 14. Implementation Order
1. Monorepo + shared package + API skeleton (config, logger, errors, pipeline) + Angular shell, i18n/RTL, DataTable.
2. Tenant plugin + auth + RBAC + settings + users/roles.
3. Products, categories, units, warehouses, stock levels/movements, adjustments/transfers.
4. Customers, invoices (issue/cancel transactions), payments, PDF + QR.
5. Suppliers, purchase orders, goods receipt + avg cost.
6. Dashboard KPIs/charts, alerts & insights jobs, notifications.
7. Super Admin, quotations, reports/export, audit viewer, landing page, seed, tests, deployment.
