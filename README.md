# Smart ERP — Business Management System

Multi-tenant, bilingual (Arabic / English) ERP for small and medium businesses:
sales & VAT invoicing, inventory, purchasing, and a smart insights dashboard.

> Docs: [PRD](docs/prd.md) · [Technical Spec](docs/spec.md)

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | Angular 22 (standalone, zoneless, signals), PrimeNG 22, Tailwind CSS 4, ngx-translate |
| Backend | Node.js 22, Express 5, TypeScript, Zod, pino |
| Database | MongoDB (replica set) + Mongoose 9 |
| Shared | `@erp/shared` — permissions, error codes, API types, money utils |
| Tests | Vitest (api, shared, web), Supertest, mongodb-memory-server |

## Monorepo Structure

```
ERP-SYSTEM/
├─ apps/
│  ├─ api/        # Express REST API  (/api/v1)
│  └─ web/        # Angular app (SPA + prerendered landing page)
├─ packages/
│  └─ shared/     # Code shared by api & web
├─ docs/          # PRD + technical spec
└─ docker-compose.yml  # Local MongoDB replica set
```

## Getting Started

**Requirements:** Node.js 22.12+, npm 10+, Docker (or a MongoDB Atlas cluster).

```bash
# 1. Install all workspaces (also builds @erp/shared)
npm install

# 2. Start MongoDB (single-node replica set, needed for transactions)
docker compose up -d

# 3. API environment
cp apps/api/.env.example apps/api/.env      # Windows: copy apps\api\.env.example apps\api\.env

# 4. Run shared (watch) + API + web together
npm run dev
```

- Web: http://localhost:4200 (proxies `/api` → `http://localhost:4000`)
- API health: http://localhost:4000/api/v1/health

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

## Demo Data

```bash
npm run seed -w @erp/api
```

Creates one demo company with 12 months of activity: 3 warehouses, ~58 customers, 25 suppliers, 53 products,
~48 purchase orders, 260 invoices with payments, 70 quotations, stock movements and notifications.
Re-running replaces only the demo company. Password for every account: `Demo12345`.

| Role | Email | Can do |
|---|---|---|
| Owner | owner@demo.smart-erp.dev | Everything |
| Admin | admin@demo.smart-erp.dev | Everything |
| Sales | sales@demo.smart-erp.dev | Customers, quotations, invoices, payments |
| Inventory | inventory@demo.smart-erp.dev | Products, warehouses, stock, suppliers, purchase orders |
| Accountant | accountant@demo.smart-erp.dev | Read invoices/customers/suppliers/POs, record payments |

## Deployment (free tiers)

| Part | Service | Config |
|---|---|---|
| Database | MongoDB Atlas (M0) | replica set → transactions work |
| API | Render web service | `render.yaml` (Blueprint) |
| Web | Vercel (static) | `apps/web/vercel.json` |

The browser only talks to the Vercel domain: Vercel proxies `/api/*` to Render, so the refresh-token
cookie stays first-party (`SameSite=Strict`) and no CORS is needed.

1. **Atlas:** create a free cluster → database user → Network Access `0.0.0.0/0` → copy the `mongodb+srv://…/smart-erp` URI.
2. **GitHub:** push this repo.
3. **Render:** New → Blueprint → this repo. Set `MONGO_URI` and `CLIENT_URL` (your Vercel URL). Wait for `/api/v1/health` → `ok`.
4. **Vercel:** New Project → this repo → Root Directory `apps/web`. In `apps/web/vercel.json` replace
   `YOUR-API.onrender.com` with the Render host, commit, deploy.
5. **Demo data (optional):** run the seed against Atlas from your machine:
   `MONGO_URI="mongodb+srv://…" npm run seed -w @erp/api` (PowerShell: `$env:MONGO_URI="…"; npm run seed -w @erp/api`).
6. **PrimeNG license:** set `PRIMEUI_LICENSE_KEY` in `apps/web/src/app/core/config/app.constants.ts`.

> Render's free plan sleeps after 15 minutes without traffic; the first request after that takes ~1 minute.

## Roadmap

- [x] **Phase 0 — Foundation:** monorepo, API skeleton (config, logging, errors, validation, list query), Angular shell, i18n + RTL, shared skeleton & data table
- [x] **Phase 1a — Auth:** company registration, login, refresh-token rotation, logout, tenant isolation, RBAC middleware, login/register pages, guards, dark mode, notifications panel (demo data)
- [ ] Phase 1b — Users & roles management, company settings
- [x] Phase 2 — Products, warehouses, stock (adjustments, transfers, low-stock alerts)
- [x] Phase 3 — Customers, quotations, invoices, payments (PDF + VAT QR pending)
- [x] Phase 4 — Suppliers, purchase orders, goods receipt (weighted average cost)
- [ ] Phase 5 — Smart dashboard, alerts, insights
- [ ] Phase 6 — Reports, quotations, super admin, deployment
