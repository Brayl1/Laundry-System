# Laundry Shop

A point-of-sale and shop-management web app for a laundry shop. Cashiers take orders and run the washers from a
live dashboard. Admins manage staff, prices, stock and reports from a separate admin panel.

Built with React, TypeScript, Vite and Tailwind CSS. Supabase provides the database, sign-in and live updates.

## Features

**Cashier side**
- Live dashboard: today's orders, washers (free, reserved, in use) and an order queue that updates by itself
- New transaction wizard: customer, service, weight, add-ons, washer, payment, receipt
- Washer assignment: a washer is reserved when the order is created and switches to *In use* only when the cashier confirms the clothes are loaded
- Touch POS screen for tablets, drag-and-drop order queue, printable receipts
- Shelf map: store finished bags in a bin, with one active order per bin
- Optional SMS when an order is ready

**Admin panel** (`/admin`)
- Overview, orders, customers, credit ledger (utang), reports with CSV export
- Staff accounts: add, change role, deactivate, reset password
- Pricing and add-ons, machines, inventory with low-stock alerts, shelves, shop info
- Audit log of changes

**Public**
- Order tracking page at `/track/<order code>` for customers

## Tech stack

| Part | Choice |
|---|---|
| Frontend | React 19, TypeScript, Vite 6, Tailwind CSS 4, React Router 7, Motion, Recharts |
| Backend | Supabase (Postgres, Auth, Realtime, Edge Functions) |
| Tests | Vitest |
| Hosting | Vercel (frontend), Supabase cloud (backend) |

## Getting started

You need Node.js 20 or newer and a Supabase project (a free one is enough).

```bash
npm install
cp .env.example .env.local      # on Windows: copy .env.example .env.local
```

Fill in `.env.local`:

```
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_SMS_ENABLED=false
```

Find both values in the Supabase dashboard under **Project Settings > API**. Use the **anon** key only, never the
`service_role` key.

Set up the database (see [Database](#database)), then:

```bash
npm run dev
```

Open http://localhost:5173. Staff sign in at `/login`, admins at `/admin/login`.

### Demo accounts

The seed file (`supabase/seed.sql`) creates two users. Both use the password `pass123`. Change or remove them before
real use.

| Username | Role | Lands in |
|---|---|---|
| `cashier1` | admin | Admin panel |
| `cashier2` | cashier | Cashier dashboard |

A username maps to the sign-in email `username@laundry.local`.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Type-check and build to `dist` |
| `npm run preview` | Preview the production build |
| `npm test` | Run the unit tests |
| `npm run db:start` / `db:stop` | Start or stop a local Supabase (needs Docker) |
| `npm run db:reset` | Rebuild the local database from the migrations and seed |
| `npm run db:types` | Regenerate `src/lib/database.types.ts` from the local database |

## Database

The schema lives in `supabase/migrations`, applied in filename order:

| File | Adds |
|---|---|
| `20261028000000_schema.sql` | Tables, security rules and `create_order` |
| `20261030000000_admin_panel.sql` | Staff management functions, account deactivation, customer stats |
| `20261030100000_machine_reserved.sql` | The `reserved` washer status |
| `20261030100100_assign_machines.sql` | Washer assignment and `start_order` |
| `20261101000000_advanced_features.sql` | Ledger, inventory, audit log, SMS log, machine service, tracking |
| `20261102000000_shelf_map.sql` | Shelves and bins |

**Hosted project:** link it once, then push the migrations.

```bash
npx supabase login
npx supabase link --project-ref YOUR-PROJECT-REF
npx supabase db push
```

Alternatively, paste each file into the Supabase SQL Editor as its own query, in the order above. Do not mix the two
methods on the same project. Afterwards, refresh the API cache:

```sql
notify pgrst, 'reload schema';
```

`db push` does not run `seed.sql`. Add your first admin yourself, for example by running the seed once on a fresh
project or by creating a user and setting its role to `admin` in `public.profiles`.

**Local database (Docker):** `npm run db:start`, copy the printed URL and anon key into `.env.local`, then
`npm run db:reset`. This applies every migration and the seed.

**Main tables:** `profiles`, `customers`, `settings`, `addons`, `machines`, `orders`, `order_addons`,
`ledger_entries`, `supplies`, `audit_log`, `sms_log`, `shelves`, `shelf_bins`. Orders are read through the
`order_details` view.

### SMS (optional)

```bash
npx supabase functions deploy send-sms
npx supabase secrets set SEMAPHORE_API_KEY=your-key
```

Then set `VITE_SMS_ENABLED=true`. The key stays in the edge function; the browser never sees it. More detail is in
[ADVANCED_FEATURES.md](ADVANCED_FEATURES.md).

## Deployment

The frontend is a static build hosted on Vercel. The database, sign-in and API run on a Supabase cloud project.

1. Apply the migrations to the Supabase project (see [Database](#database)) and create the first admin.
2. Push the code to GitHub.
3. In Vercel, import the repository. It detects Vite: build command `npm run build`, output directory `dist`.
4. Add the environment variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (and `VITE_SMS_ENABLED`).
   They are read while building, so redeploy after changing them.
5. Keep a `vercel.json` in the project root so refreshing a page such as `/admin` does not return a 404:

   ```json
   { "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
   ```

6. In Supabase, under **Authentication > URL Configuration**, set the Site URL to your Vercel address.

With the Git repository connected, every push to `main` redeploys to production, and other branches get preview
links.

## Project structure

```
src/
  app/        Router, route guards, cashier shell
  admin/      Admin shell, sidebar, overview and route table
  features/   One folder per feature, each with its own pages, api.ts and logic
              (dashboard, transaction, pos, orders, shelf, ledger, inventory,
               reports, customers, staff, settings, audit, notifications, receipt, track, auth)
  shared/     UI components, layout and hooks used everywhere
  lib/        Supabase client, generated types, formatting helpers
supabase/
  migrations/ Database schema, in order
  functions/  Edge functions (send-sms)
  seed.sql    Demo shop data and the two demo users
```

Features import from `shared/` and `lib/`, not from each other. The exceptions are `auth`, `receipt` and the
dashboard, which composes other features.

## Security

- Every table has row-level security. Staff can read and take orders; only admins can change prices, machines,
  shelves and staff.
- Staff accounts are managed through admin-only database functions. The browser never touches the `auth` schema.
- Deactivated accounts are blocked at sign-in and for order writes.
- The anon key is public by design. The `service_role` key must never be placed in the app or in Vercel's
  `VITE_` variables.
- `.env.local` is ignored by git. Do not commit it.