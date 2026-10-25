# Smart ERP — Product Requirements Document (PRD)

| Field | Value |
|---|---|
| Product | Smart ERP — Business Management System |
| Owner | Doaa Elomda |
| Version | 1.0 (MVP) |
| Date | 2026-10-24 |
| Status | Draft |

---

## 1. Overview

Smart ERP is a multi-tenant, bilingual (Arabic/English) web ERP for small and medium businesses (SMBs). It covers user management, sales, invoicing, inventory, and purchasing, with a "smart" dashboard of KPIs, insights, and proactive alerts.

### 1.1 Goals
1. Ship a production-quality **full-stack portfolio project** (Angular + Node/Express + MongoDB).
2. Demonstrate real-world architecture: multi-tenancy, RBAC, transactions, i18n/RTL, clean code.
3. Deliver a complete, polished MVP rather than a large, unfinished ERP.

### 1.2 Non-Goals (MVP)
- HR, payroll, attendance.
- Full double-entry accounting / general ledger.
- Official Egyptian Tax Authority (ETA) e-invoice integration (signing + submission API).
- Manufacturing (BOM, work orders), POS hardware.
- AI/LLM features (planned for a later phase).
- Native mobile apps.

---

## 2. Target Users & Personas

| Persona | Description | Main Needs |
|---|---|---|
| **Owner / Admin** | Owns the company account (tenant) | Overview of business health, manage users & settings |
| **Sales Rep** | Handles customers and sales | Quotes, invoices, payments, customer history |
| **Inventory / Purchasing Officer** | Manages stock and suppliers | Stock levels, transfers, purchase orders, receiving |
| **Accountant (read-focused)** | Follows money in/out | Invoices, payments, receivables/payables reports |
| **Super Admin (platform)** | Runs the SaaS platform | Create/suspend tenants (minimal in MVP) |

---

## 3. Key Decisions

| Area | Decision |
|---|---|
| Business type | Generic SMB (trading/services) |
| Tenancy | Multi-tenant, shared DB, `tenantId` on every tenant-owned document |
| Frontend | Angular 22 (standalone, zoneless, signals), PrimeNG 22 + Tailwind CSS (tailwindcss-primeui) |
| Backend | Node.js + Express (REST, versioned `/api/v1`) |
| Database | MongoDB (Atlas replica set) + Mongoose, **transactions** for invoices & stock |
| Auth | JWT access token (short-lived) + refresh token (httpOnly cookie, rotation) |
| Authorization | RBAC: roles → permissions (e.g. `invoices.create`) |
| i18n | Arabic + English via ngx-translate, RTL/LTR driven by `LanguageService` |
| Market | Egypt: default currency EGP, VAT 14% (configurable per tenant), locale ar-EG / en-EG with Latin digits |
| Tax | Configurable VAT per tenant (default 14%) + QR code on printed invoices |
| "Smart" | KPI dashboard, insights, and rule-based alerts |
| Products | Two types: `stock` (tracked) and `service` (no stock movement); no variants in MVP |
| Inventory | Weighted average cost; negative stock not allowed |
| Currency | Single currency per tenant (default EGP) |
| Theme | Light / dark / system (ThemeService, PrimeNG preset tokens + CSS variables) |
| Rendering | SPA for the app; public landing page prerendered (SSR/prerender) |
| Platform | Simple Super Admin panel (tenants list, suspend/activate, stats); no billing |
| Repo | Monorepo: `apps/web`, `apps/api`, `packages/shared` |
| Charts | ngx-echarts |

---

## 4. Functional Requirements

> **Global rules (apply to every module)**
> - Every list endpoint and table supports **search, sort, pagination, and filters**.
> - All tenant data is isolated by `tenantId` (enforced in middleware + Mongoose plugin, never trusted from the client).
> - Soft delete (`isDeleted`, `deletedAt`) for business records; no hard delete of documents with financial impact.
> - Every create/update/delete is written to an **audit log**.
> - Buttons/actions are shown/enabled based on backend permissions and document status.
> - All UI supports AR/EN and RTL/LTR; dates, numbers, and currency are locale-formatted.

### 4.1 Auth, Tenants, Users & Roles

| ID | Requirement | Priority |
|---|---|---|
| AUTH-01 | Company sign-up creates a tenant + owner user | P0 |
| AUTH-02 | Login / logout / refresh token rotation | P0 |
| AUTH-03 | Forgot / reset password via email link | P1 |
| AUTH-04 | Invite users by email; user sets password on first login | P1 |
| USR-01 | CRUD users; activate/deactivate | P0 |
| ROLE-01 | Default roles: Owner, Admin, Sales, Inventory, Accountant | P0 |
| ROLE-02 | Custom roles with a permission matrix (module × action) | P1 |
| SET-01 | Company settings: name, logo, VAT number, VAT %, currency, address, default language | P0 |
| SET-02 | Document numbering prefixes (e.g. `INV-2026-0001`) per tenant | P0 |
| AUD-01 | Audit log viewer (who, what, when, before/after) | P1 |
| SA-01 | Super Admin: list tenants (search/sort/paginate), suspend/activate, basic stats (users, invoices, last activity) | P1 |
| SA-02 | Suspended tenant users cannot log in or call the API | P1 |

### 4.2 Customers & Sales

| ID | Requirement | Priority |
|---|---|---|
| CUS-01 | CRUD customers (name, contact, VAT no., address, credit limit, notes) | P0 |
| CUS-02 | Customer profile: invoices, payments, outstanding balance | P0 |
| SAL-01 | Quotations: create, edit, send (PDF), status `draft → sent → accepted/rejected/expired` | P1 |
| SAL-02 | Convert quotation → invoice | P1 |
| INV-01 | Sales invoice: lines (product, qty, price, discount, VAT), totals auto-calculated | P0 |
| INV-02 | Invoice status: `draft → issued → partially paid → paid`, `cancelled` | P0 |
| INV-03 | Issuing an invoice **deducts stock** in a DB transaction; cancelling reverses it | P0 |
| INV-04 | Issued invoices are immutable; corrections via credit note | P1 |
| INV-05 | Printable/downloadable PDF (AR/EN) with company logo + VAT QR code | P0 |
| PAY-01 | Record customer payments (full/partial; cash, bank transfer, card) | P0 |
| PAY-02 | Overdue detection based on due date | P0 |

### 4.3 Products, Inventory & Purchasing

| ID | Requirement | Priority |
|---|---|---|
| PRD-01 | CRUD products: type (`stock`/`service`), SKU, barcode, name (AR/EN), category, unit, cost, sale price, VAT applicable, reorder level (stock only), image | P0 |
| PRD-03 | Service items can be invoiced but never create stock movements | P0 |
| PRD-02 | Categories & units of measure | P0 |
| WH-01 | Multiple warehouses per tenant | P0 |
| STK-01 | Stock levels per product per warehouse | P0 |
| STK-02 | Stock movements ledger (in, out, transfer, adjustment) — every quantity change creates a movement | P0 |
| STK-03 | Stock transfer between warehouses | P1 |
| STK-04 | Stock adjustment with reason (damage, count correction) | P1 |
| STK-05 | Costing method: **weighted average cost** | P0 |
| SUP-01 | CRUD suppliers | P0 |
| PO-01 | Purchase orders: status `draft → sent → partially received → received`, `cancelled` | P0 |
| PO-02 | Goods receipt against PO (partial allowed) → increases stock + updates average cost (transaction) | P0 |
| PO-03 | Supplier bills & payments (payables) | P1 |

### 4.4 Smart Dashboard & Insights

| ID | Requirement | Priority |
|---|---|---|
| DSH-01 | KPI cards: revenue (today / month), outstanding receivables, payables, stock value, # overdue invoices | P0 |
| DSH-02 | Charts: revenue trend (12 months), top products, top customers, sales by category | P0 |
| DSH-03 | Date-range filter + comparison vs previous period (% change) | P1 |
| ALR-01 | Alerts: low stock (≤ reorder level), overdue invoices, POs late to arrive | P0 |
| ALR-02 | In-app notification center (bell) + optional email digest | P1 |
| INS-01 | Rule-based insights, e.g. "Product X sales dropped 30% vs last month", "Customer Y exceeded credit limit", "Dead stock: no movement in 90 days" | P1 |
| RPT-01 | Reports: sales by period/customer/product, stock valuation, receivables aging — exportable to Excel/PDF | P1 |

---

## 5. Non-Functional Requirements

| Category | Requirement |
|---|---|
| Security | bcrypt password hashing, helmet, CORS allowlist, rate limiting on auth, input validation (Zod/Joi) on every endpoint, no tenant data leakage (automated tests) |
| Performance | List API p95 < 300 ms for 10k records; indexes on `tenantId` + common filters; dashboard aggregates cached/precomputed |
| Data integrity | Mongo transactions for invoice issue/cancel, goods receipt, payments; atomic per-tenant sequence counters |
| Accessibility | WCAG 2.1 AA basics: keyboard navigation, labels, contrast |
| Responsiveness | Fully usable on desktop and tablet; core flows usable on mobile |
| Reliability | Centralized error handling, consistent error format, structured logging |
| Maintainability | Feature-based folders, typed DTOs, ESLint/Prettier, conventional commits |
| Testing | Backend: unit + integration (Vitest + Supertest + in-memory Mongo replica set). Frontend: unit tests for services/critical components |

---

## 6. Architecture

### 6.1 High Level
```
Angular 22 SPA + prerendered landing
   │  HTTPS + JWT
   ▼
Express API (/api/v1)
   ├─ auth middleware → tenant middleware → permission guard → validator → controller → service → model
   ▼
MongoDB Atlas (replica set, transactions)
```

### 6.2 Backend Structure (feature-based)
```
src/
  config/          # env, db, logger
  core/            # errors, middlewares (auth, tenant, rbac, validate, errorHandler), utils
  plugins/         # mongoose tenant plugin, soft-delete, audit
  modules/
    auth/  tenants/  users/  roles/
    customers/  quotations/  invoices/  payments/
    products/  categories/  warehouses/  stock/
    suppliers/  purchase-orders/  goods-receipts/
    dashboard/  notifications/  reports/  audit/
      ├─ *.routes.ts  *.controller.ts  *.service.ts  *.model.ts  *.validation.ts
```

### 6.3 Frontend Structure
```
src/app/
  core/        # interceptors (auth, tenant, error), guards, LanguageService, AuthService
  shared/      # data-table (search/sort/pagination), skeleton, form controls, dialogs, pipes
  layout/      # shell, sidebar, header, notification center
  features/    # auth, dashboard, customers, sales, inventory, purchasing, settings, users
```
- Lazy-loaded feature routes, signals for state, `takeUntilDestroyed` for subscriptions.
- One reusable `DataTable` component driven by a shared list-query model.

### 6.4 Standard List API Contract
```
GET /api/v1/invoices?page=1&limit=20&search=acme&sort=-issueDate&status=issued
→ { data: [...], meta: { page, limit, total, totalPages } }
```

### 6.5 Error Format
```json
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [...] } }
```

---

## 7. Core Data Model (simplified)

| Collection | Key Fields |
|---|---|
| `tenants` | name, logo, vatNumber, vatRate, currency, defaultLanguage, status |
| `users` | tenantId, name, email, passwordHash, roleId, isActive, lastLoginAt |
| `roles` | tenantId, name, permissions[] |
| `customers` | tenantId, name, email, phone, vatNumber, address, creditLimit, balance |
| `suppliers` | tenantId, name, contact, vatNumber, balance |
| `products` | tenantId, type(stock/service), sku, barcode, name{ar,en}, categoryId, unit, salePrice, avgCost, vatApplicable, reorderLevel |
| `warehouses` | tenantId, name, location |
| `stockLevels` | tenantId, productId, warehouseId, quantity (unique: tenant+product+warehouse) |
| `stockMovements` | tenantId, productId, warehouseId, type, qty, unitCost, refType, refId, createdBy |
| `quotations` | tenantId, number, customerId, lines[], totals, status, validUntil |
| `invoices` | tenantId, number, customerId, warehouseId, lines[], subtotal, discount, vat, total, paidAmount, status, issueDate, dueDate |
| `payments` | tenantId, type(in/out), partyId, refId, amount, method, date |
| `purchaseOrders` | tenantId, number, supplierId, lines[], status, expectedDate |
| `goodsReceipts` | tenantId, poId, warehouseId, lines[], receivedAt |
| `counters` | tenantId, key, seq (atomic `$inc`) |
| `notifications` | tenantId, userId, type, message, readAt |
| `auditLogs` | tenantId, userId, entity, entityId, action, before, after, at |

---

## 8. Key User Flows

1. **Onboarding:** Sign up → create company → set VAT/currency/logo → add warehouse → invite users.
2. **Sell:** Create customer → create invoice (draft) → issue (stock out + number assigned) → download PDF with QR → record payment.
3. **Buy:** Create supplier → PO → send → receive goods (partial/full) → stock + avg cost updated.
4. **Monitor:** Dashboard KPIs → low-stock alert → create PO from alert.

---

## 9. Roadmap & Milestones

| Phase | Scope | Est. |
|---|---|---|
| **0. Foundation** | Repo setup, CI, Express skeleton, tenant/auth middleware, Angular shell, i18n/RTL, shared DataTable | 2 wks |
| **1. Auth & Admin** | Sign-up, login, refresh, users, roles/permissions, settings, audit | 2 wks |
| **2. Inventory** | Products, categories, warehouses, stock levels/movements, adjustments | 2 wks |
| **3. Sales** | Customers, invoices (transactional), payments, PDF + QR | 3 wks |
| **4. Purchasing** | Suppliers, POs, goods receipt, avg cost | 2 wks |
| **5. Smart Dashboard** | KPIs, charts, alerts, notifications | 2 wks |
| **6. Polish** | Reports/export, quotations, tests, performance, demo seed data, deployment, README | 2 wks |

**Later phases:** AI assistant (natural-language queries over data), sales forecasting, invoice OCR, approval workflows, real-time updates (Socket.IO), HR, accounting/GL, ETA e-invoice integration.

---

## 10. Success Metrics (Portfolio)

- All P0 requirements done, deployed, with a public demo + seeded demo tenant.
- Backend test coverage ≥ 70% on services; zero cross-tenant leakage in tests.
- Lighthouse ≥ 90 (performance, accessibility) on dashboard & list pages.
- Clear README: architecture diagram, ERD, setup, demo credentials, screenshots/GIF.

---

## 11. Deployment

| Part | Target |
|---|---|
| Frontend | Vercel / Netlify |
| API | Render / Railway (Vercel serverless is a poor fit for Mongo transactions + long connections) |
| DB | MongoDB Atlas (free/shared cluster, replica set) |
| Files (logos, product images) | Cloudinary or S3-compatible storage |
| Email | Resend / SendGrid |
| CI | GitHub Actions: lint, test, build |

---

## 12. Resolved Decisions

- Costing: weighted average. Negative stock: **not allowed**.
- Single currency per tenant (default EGP), VAT 14%.
- Service items supported in MVP; product variants deferred.
- SPA app + prerendered public landing page.
- Simple Super Admin (no subscriptions/billing).
- Quotations, credit notes, supplier bills are P1 (after core P0 flows).

Technical details live in **spec.md**.
