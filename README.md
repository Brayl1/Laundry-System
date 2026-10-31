# Laundry POS

Point-of-sale for a laundry shop, in two separate interfaces:

- **Cashier POS** (`/`): a 5-step order wizard, receipts, and live order tracking.
- **Admin panel** (`/admin`): sales overview, all orders, customers, reports with CSV export, staff accounts, pricing and add-ons, machines, and shop info.

**Stack:** React 19 + TypeScript (Vite) · Supabase (Postgres, Auth, Realtime), run locally · Motion (`motion/react`) for animation · Tailwind CSS v4 · Recharts · lucide-react

## Run it

Requirements: Node 20+, Docker Desktop running.

```bash
npm install
npx supabase start          # first run pulls the Docker images
npx supabase status -o env  # copy API_URL and ANON_KEY into .env.local (see .env.example)
npm run dev                 # http://localhost:5173
```

Demo logins (both password `pass123`):

| User | Role | Lands in |
|---|---|---|
| `cashier1` | admin | Admin panel (`/admin`), with an "Open POS" shortcut |
| `cashier2` | cashier | Cashier POS (`/`) |

Staff sign in at `/login`, admins at `/admin/login`. After signing in, each role is sent to its own side. A cashier who opens `/admin` is sent back to the POS.

**Upgrading an existing database:** run `npm run db:reset` locally. On a hosted project, apply these three files in order with `supabase db push`, or paste each one into the SQL editor as its own query (the second must finish before the third, because Postgres cannot use a new enum value in the same transaction that adds it):

1. `20261030000000_admin_panel.sql`
2. `20261030100000_machine_reserved.sql`
3. `20261030100100_assign_machines.sql`

`seed.sql` only runs on a reset; on a hosted project, add cashiers from **Admin > Staff** instead.

### How a washer is assigned and started

1. **New transaction, Service step:** the cashier picks a free washer (required for self-service, optional for full-service). Paying creates the order as `pending` and the washer becomes `reserved`: held for that order, clothes not loaded yet.
2. **Start washing:** from the order ticket or the reserved washer on the dashboard, the cashier confirms "Clothes are in" (and may switch to another free washer, or pick one if none was assigned). The `start_order` function then marks the order `washing` and the washer `in use`. The washer panel animates from this status: water rises and the drum spins.
3. **Done / handed over:** the washer is freed (`idle`) again.

Machine status follows the order's status in a database trigger, so changing an order's status from the admin Orders page keeps the washer in step.

| Script | What it does |
|---|---|
| `npm run dev` / `build` / `preview` | Vite |
| `npm test` | Vitest unit tests (pricing, report stats, CSV escaping) |
| `npm run db:reset` | Rebuild the local DB from migrations + `supabase/seed.sql` |
| `npm run db:types` | Regenerate `src/lib/database.types.ts` after a schema change (the file was edited by hand for the admin migration, so regenerate it once the DB is migrated) |
| `npm run db:stop` | Stop the local Supabase containers |

## Architecture

Feature-based modules. Each feature owns its UI, hooks and an `api.ts` that is its only Supabase access, and exposes a single `index.ts`.

```
src/
  app/        App, router, RoleGuard (sign-in / role check), PosShell (cashier header + page transition)
  admin/      AdminShell (sidebar layout), nav, routes, Overview page. Composes the features below.
  lib/        supabase client, generated DB types, domain types, formatting, CSV, order mapper
  shared/     ui/ (Button, Card, SelectCard, Input, Modal, Stepper, AnimatedNumber…), layout/, hooks/
  features/
    auth/         username → Supabase Auth login, profile context
    dashboard/    cashier action cards
    transaction/  wizard reducer, pure pricing, steps/, customer lookup, create_order RPC
    receipt/      thermal receipt + print stylesheet (used by transaction and orders)
    orders/       live table (Realtime), status changes, search/filter
    reports/      stats (pure), charts, CSV export, date ranges
    settings/     pricing, add-ons, machines and shop-info pages (admin panel)
    staff/        staff accounts: add, change role, deactivate, reset password (admin panel)
    customers/    returning customers with order counts and spend (admin panel)
supabase/
  migrations/  schema, RLS, triggers, create_order RPC, order_details view
  seed.sql     demo user, settings, add-ons, machines
```

Dependency rule: features import from `shared/` and `lib/`, never from each other. The exceptions are `auth` (app-wide session) and `receipt` (shared by transaction and orders). `app/` and `admin/` sit above the features and may import their `index.ts`.

### Routes

| Path | Who | Page |
|---|---|---|
| `/login`, `/admin/login` | public | Staff / admin sign-in |
| `/`, `/transaction`, `/orders` | any active staff | Cashier POS |
| `/admin`, `/admin/orders`, `/customers`, `/reports`, `/staff`, `/pricing`, `/machines`, `/shop` | admins only | Admin panel |

### Data rules enforced in the database

- **Totals are computed on the server.** `create_order` recomputes weight × price per kg + add-ons from the current settings; the client's total is only a preview.
- Orders snapshot `price_per_kg` and add-on names/prices, so later price changes never rewrite history.
- Staff can change only an order's `status` (column-level grant); money fields are read-only once created.
- Self-service orders claim the first idle machine. Moving the order to *Done* or *Claimed* frees it (trigger).
- Settings, add-ons and machines can be edited only by `admin` profiles (RLS).
- Staff accounts are managed only through admin-only database functions (`admin_create_staff`, `admin_set_staff_role`, `admin_set_staff_active`, `admin_reset_staff_password`); the browser never touches `auth.users`. Admins cannot change their own role or deactivate themselves.
- Deactivating staff sets `profiles.active = false` and bans the auth user. Order and customer writes also require an active account, so an old session stops working at once.

### Differences from the original prototype

- CSV export quotes its fields, so dates with commas no longer shift columns. Date and time are separate columns.
- The payment label reads "QR Code" (it was "Qr"), and the pie chart uses a legend with counts instead of clipped outside labels.
- The pie colors are blue/amber: the original blue/purple pair can't be told apart with deuteranopia.
- Added: returning-customer lookup/create, machine assignment, a Settings page, report date ranges, live order updates.
