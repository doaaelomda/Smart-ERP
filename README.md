# Smart ERP — Business Management System

Multi-tenant, bilingual (Arabic / English) ERP for small and medium businesses:
sales & VAT invoicing, inventory, purchasing and in-app notifications — built with Angular, Express and MongoDB.

> Docs: [Code walkthrough (PDF, Arabic)](docs/Smart-ERP-Code-Guide.pdf) · [PRD](docs/prd.md) · [Technical Spec](docs/spec.md)

## Features

- **Multi-tenancy** — many companies share one database; every query is scoped to the signed-in company automatically (Mongoose plugin + `AsyncLocalStorage`).
- **Auth** — login with a single SuperAdmin account (no public sign-up), JWT token, rate limiting.
- **Roles & permissions (RBAC)** — SuperAdmin and Accountant; enforced by the API, mirrored in routes, menus and buttons.
- **Sales** — customers, quotations (→ invoice), VAT invoices (draft → issued → paid / cancelled), partial payments, customer balances.
- **Inventory** — products & services, multiple warehouses, stock ledger, adjustments, transfers, low-stock alerts.
- **Purchasing** — suppliers, purchase orders, partial goods receipt with weighted average cost, supplier balances.
- **Safe money math** — integer minor units and one shared `calcLine` for UI preview and server totals.
- **Consistency** — issuing, cancelling, paying and receiving run in MongoDB transactions; yearly document numbers (`INV-2026-0001`).
- **UI** — PrimeNG + Tailwind, Arabic RTL / English LTR, light / dark / system theme, server-side tables (search, sort, pagination), responsive layout.

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | Angular 22 (standalone, zoneless, signals, SSR for the landing page), PrimeNG 22, Tailwind CSS 4, ngx-translate |
| Backend | Node.js 22, Express 5, TypeScript, Zod 4, pino |
| Database | MongoDB replica set (Atlas or Docker) + Mongoose 9 |
| Shared | `@erp/shared` — permissions, roles, error codes, API types, money utils |
| Tests | Vitest (api, shared, web), Supertest, mongodb-memory-server |

## Project Structure

```
ERP-SYSTEM/
├─ apps/
│  ├─ api/                    # Express REST API (/api/v1)
│  │  └─ src/
│  │     ├─ config/           # env (Zod-validated), db, logger
│  │     ├─ core/             # request context, errors, middlewares, list query, transactions
│  │     ├─ plugins/          # tenant.plugin.ts (multi-tenancy guard)
│  │     ├─ modules/          # auth, customers, quotations, invoices, payments, products,
│  │     │                    # warehouses, stock, suppliers, purchase-orders, notifications
│  └─ web/                    # Angular app
│     └─ src/app/
│        ├─ core/             # auth, http, i18n, theme, dialog/toast services
│        ├─ shared/           # data-table, field, autocomplete, pipes, ...
│        ├─ layout/           # shell, header, sidebar
│        ├─ features/         # one folder per module
│        └─ public/landing/
├─ packages/shared/           # code shared by api & web
├─ docs/                      # PRD, spec, code walkthrough PDF
├─ docker-compose.yml         # optional local MongoDB replica set
└─ render.yaml                # Render Blueprint for the API
```

Every API module follows the same pattern: `model` → `validation` (Zod) → `service` (business logic) → `controller` (HTTP only) → `routes` (auth + permission + validation).

## Getting Started

**Requirements:** Node.js 22.12+, npm 10+, and a MongoDB **replica set** (transactions need one) — either a free MongoDB Atlas cluster or Docker.

```bash
# 1. Install all workspaces (also builds @erp/shared)
npm install

# 2. API environment
cp apps/api/.env.example apps/api/.env      # Windows: copy apps\api\.env.example apps\api\.env
```

**3. Database — pick one:**

- **MongoDB Atlas (no Docker):** create a free cluster → Database user → Network Access (your IP or `0.0.0.0/0`) → copy the connection string into `apps/api/.env`:
  ```
  MONGO_URI=mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/smart-erp?retryWrites=true&w=majority
  ```
- **Docker:** `docker compose up -d` (keeps the default `MONGO_URI` from `.env.example`).

```bash
# 4. Set a JWT secret in apps/api/.env (at least 32 characters)
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

# 5. Run shared (watch) + API + web together
npm run dev
```

- Web: http://localhost:4200 (proxies `/api` → `http://localhost:4000`)
- API health: http://localhost:4000/api/v1/health

## Environment Variables (`apps/api/.env`)

| Variable | Default | Description |
|---|---|---|
| `MONGO_URI` | local replica set | MongoDB connection string |
| `JWT_ACCESS_SECRET` | — (required) | At least 32 characters |
| `CLIENT_URL` | `http://localhost:4200` | Allowed CORS origin |
| `PORT` | `4000` | API port |
| `JWT_ACCESS_TTL_SECONDS` | `604800` | Login token lifetime (7 days) |
| `BCRYPT_ROUNDS` | `12` | Password hashing cost |
| `DNS_SERVERS` | — | e.g. `8.8.8.8,1.1.1.1` when `mongodb+srv` fails with `querySrv` |
| `TRUST_PROXY` | `1` | Proxies in front of the API (Vercel → Render = `2`) |
| `LOG_LEVEL` | `info` | pino log level |

The server validates these on start and exits with a clear message if one is wrong.

## Users

There is no public sign-up. The first SuperAdmin account is created by the developer; the SuperAdmin then adds the other users (SuperAdmin or Accountant) from the **Users** page.

## Scripts (root)

| Script | Description |
|---|---|
| `npm run dev` | shared (watch) + api (tsx watch) + web (ng serve) |
| `npm run dev:api` / `npm run dev:web` | Run one app |
| `npm run build` | Build shared → api → web |
| `npm test` | Run all tests |
| `npm run typecheck` | Type-check shared and api |
| `npm run format` | Prettier |

Workspace commands: `npm run <script> -w @erp/api` · `-w web` · `-w @erp/shared`.

## Troubleshooting

| Problem | Fix |
|---|---|
| `querySrv ECONNREFUSED` / `ENOTFOUND` with Atlas | Add `DNS_SERVERS=8.8.8.8,1.1.1.1` to `apps/api/.env`. |
| `Server selection timed out` with Atlas | Add your IP in Atlas → Network Access. |
| `Transaction numbers are only allowed on a replica set` | Use Atlas or the Docker replica set, not a standalone `mongod`. |
| `Invalid environment variables: JWT_ACCESS_SECRET` | Set a secret of at least 32 characters. |
| `docker` is not recognized | Docker isn't needed — use Atlas. |
| PrimeUI license banner at the bottom of the page | Add a free license key to `PRIMEUI_LICENSE_KEY` in `apps/web/src/app/core/config/app.constants.ts`. |

## Deployment (free tiers)

| Part | Service | Config |
|---|---|---|
| Database | MongoDB Atlas (M0) | replica set → transactions work |
| API | Render web service | `render.yaml` (Blueprint) |
| Web | Vercel (static) | `apps/web/vercel.json` |

The browser only talks to the Vercel domain: Vercel proxies `/api/*` to Render, so no CORS is needed.

1. **Atlas:** create a free cluster → database user → Network Access `0.0.0.0/0` → copy the `mongodb+srv://…/smart-erp` URI.
2. **GitHub:** push this repo.
3. **Render:** New → Blueprint → this repo. Set `MONGO_URI` and `CLIENT_URL` (your Vercel URL). Wait for `/api/v1/health` → `ok`.
4. **Vercel:** New Project → this repo → Root Directory `apps/web`. In `apps/web/vercel.json` replace
   `YOUR-API.onrender.com` with the Render host, commit, deploy.
5. **PrimeNG license:** set `PRIMEUI_LICENSE_KEY` in `apps/web/src/app/core/config/app.constants.ts`.

> Render's free plan sleeps after 15 minutes without traffic; the first request after that takes ~1 minute.

## Roadmap

- [x] **Phase 0 — Foundation:** monorepo, API skeleton (config, logging, errors, validation, list query), Angular shell, i18n + RTL, shared skeleton & data table
- [x] **Phase 1a — Auth:** admin account, login, logout, tenant isolation, RBAC, guards, dark mode
- [ ] Phase 1b — Users & roles management, company settings
- [x] Phase 2 — Products, warehouses, stock (adjustments, transfers, low-stock alerts)
- [x] Phase 3 — Customers, quotations, invoices, payments, notifications
- [x] Phase 4 — Suppliers, purchase orders, goods receipt (weighted average cost)
- [ ] Phase 5 — Smart dashboard with real data, insights
- [ ] Phase 6 — Reports, invoice PDF + VAT QR (ZATCA), audit log, super admin
- [x] Deployment setup — Render + Vercel + Atlas
