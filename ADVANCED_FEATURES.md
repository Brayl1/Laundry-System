# Advanced features

## Set up

```bash
npm run db:reset      # applies 20261101000000_advanced_features.sql, 20261102000000_shelf_map.sql and the seed
npm run db:types      # optional: regenerates src/lib/database.types.ts (the new code compiles without it)
npm run build && npm test
```

### SMS (Semaphore)

```bash
supabase functions deploy send-sms
supabase secrets set SEMAPHORE_API_KEY=your-key
supabase secrets set SEMAPHORE_SENDER_NAME=YourShop     # optional, must be approved by Semaphore
```

Then set `VITE_SMS_ENABLED=true` in `.env.local`. With it off, nothing is sent and nothing breaks.
The API key lives only in the edge function; the browser never sees it. Every attempt is stored in `sms_log`.

### On a hosted Supabase project

Paste each file into the SQL editor as its own query, in this order, then refresh the API cache:

1. `supabase/migrations/20261101000000_advanced_features.sql` (ledger, inventory, audit log, SMS log, machine service)
2. `supabase/migrations/20261102000000_shelf_map.sql` (shelves and bins; needs file 1 first)

```sql
notify pgrst, 'reload schema';
```

## Database tables

Every feature below keeps its data in real tables, not in the code.

| Feature | Tables and columns | Migration |
|---|---|---|
| Shelf map | `shelves` (racks), `shelf_bins` (bins on a rack), `orders.shelf_bin_id` and `orders.shelf_note`. One active order per bin is enforced by a unique index. | `20261102000000_shelf_map.sql` |
| Credit ledger (utang) | `ledger_entries` (charges and payments per customer, with due dates) | `20261101000000_advanced_features.sql` |
| Inventory and alerts | `supplies` (stock, reorder level, detergent use per kg); `machines.loads_since_service` and `machines.service_every` for service alerts | `20261101000000_advanced_features.sql` |
| Audit log | `audit_log` (filled by database triggers on orders, ledger, supplies, settings and machines) | `20261101000000_advanced_features.sql` |
| SMS | `sms_log` (every attempt, sent or failed) | `20261101000000_advanced_features.sql` |
| Public tracking page | Reads orders through a limited database function; no table of its own | `20261101000000_advanced_features.sql` |
| Staff and sign-in | `profiles` plus the staff functions | `20261030000000_admin_panel.sql` |
| Washer assignment | `machines.status` (idle, reserved, in use, maintenance) and `orders.machine_id` | `20261030100000_machine_reserved.sql`, `20261030100100_assign_machines.sql` |

## What was added

| Feature | Where |
|---|---|
| Drag-and-drop queue (Pending, Washing, Ready, Claimed) | Cashier dashboard, `features/dashboard/QueueBoard.tsx` |
| Shelf / bin locator and shelf map | Ticket "Shelf" button when Ready; map under the queue; `features/shelf` |
| SMS on drop-off (with tracking link) and on Ready | `features/notifications`, `supabase/functions/send-sms` |
| Public tracking page | `/track/<order code>`, `features/track` |
| Credit ledger (utang): charges, partial payments, due dates, SMS reminder | Admin > Credit Ledger, `features/ledger` |
| Detergent deduction per kg, low-stock and machine-service alerts | Admin > Inventory (alerts also on Overview), `features/inventory` |
| Touch POS counter screen | Dashboard > Touch POS (`/pos`), `features/pos` |
| Audit log with colour coding and role badges | Admin > Audit Log, `features/audit` |
| Busiest days/hours heatmap, cash vs GCash/QR, outstanding balances | Admin > Reports |

## Good to know

- Orders only move one step forward. Pending to Washing opens the "which washer" dialog, as before.
  The old buttons still work, and are the way to move cards on touch screens where dragging is unreliable.
- "GCash" in reports is the existing QR payment option; the database still stores it as `qr`.
- Shelves and bins live in the `shelves` and `shelf_bins` tables. An admin edits them under Admin > Shelves; a bin that still
  holds a bag cannot be deleted. The migration seeds 4 shelves with bins A to D, and moves existing "Shelf 2, Bin B" text on
  open orders into the new columns. `order_details.shelf_location` still returns one readable line for tickets and SMS.
- Machine loads are counted when an order goes from Pending to Washing.
- The tracking page shows progress only (no name, phone or price). Order codes are time-based, so treat the link as semi-private.
- Not built: a separate "Drying" status (it needs a new order status through the whole app), and sending receipts to Viber or GCash directly (those have no simple public API for small shops). SMS covers the notification need.

## Look and feel

The interface is a flat, light theme: a plain `#f6f8fa` page, white cards with a thin slate border and a soft shadow,
Inter for text, and three button styles used consistently:

| Button | Use |
|---|---|
| Solid blue | The main action on a screen (New transaction, Clothes are in, Save) |
| Solid black | Secondary solid actions (Admin Panel, Handed over) |
| White with a border | Everything else (Logout, Cancel, Touch POS) |

Colours are the standard Tailwind blue and slate scales, so there is nothing to override. Ctrl+K (Cmd+K on a Mac) still
opens the command palette to jump to any page.

## Revision: the instructor's questions (paper vs. app)

Two migrations (`20261104000000_drying_status.sql`, `20261104100000_paper_alignment.sql`, built on top of the shelf-map
migration) and the matching screens. Run `npm run db:reset` to apply them locally.

| Question / paper rule | In the app |
|---|---|
| Storage charge grows every day: who updates it, and when? (BR16, BR20) | `orders.ready_at`, `claimed_at`, `storage_fee`; function `storage_fee_for` (2 free days, then PHP 10 per day). While an order is Ready the charge is **calculated** (`order_details.storage_charge`); a trigger **saves it once** when the order becomes Claimed. Amber chip on the ticket, extra lines on the receipt. |
| Orders can have zero, one or many payments (BR18, BR19) | table `order_payments`. A new order starts with one payment of its price (trigger). **Record payment** button on any ticket with a balance opens a dialog (amount, cash or GCash/QR, GCash reference). |
| No release without payment (BR21) | **Handed over** on an order with a balance opens the payment dialog first (price + storage charge - paid). It records the payment and hands the order over, or the cashier can choose **Hand over without paying** (the balance stays on the order). |
| No stored total (BR3, BR20) | the table keeps `wash_amount` (weight x rate) and `subtotal` (price incl. add-ons, saved once). There is no `total` column; `order_details.total` is calculated and the amount due adds the storage charge (view `order_balances`). |
| MACHINE includes dryers: how are the washer and the dryer recorded? (BR24) | `machines.machine_type` (washer or dryer, set when an admin adds a machine) and table `order_machine_uses`. A WASH row is added when washing starts; **Move to drying** opens a dryer dialog and function `start_drying` records the DRY row. |
| Drying stage (BR4) | new status `drying`: Pending, Washing, **Drying**, Ready, Claimed. New Drying column on the board, Dryers row on the dashboard, Drying step on the customer tracking page. |
| Nothing reduces stock or records restocks (BR25) | table `stock_movements`. Starting a wash saves a USAGE movement per supply; Restock on the Inventory page saves a RESTOCK movement; a trigger keeps `supplies.stock` equal to the sum. |
| Audit log: separate table or built-in logging? (BR30) | `audit_log` is its own table filled by triggers; payments are logged too. |

Notes: dryers are kept apart from washers (they never appear where a washer is chosen). The Reports cash/GCash totals still count
the price paid at the counter; later payments such as the storage charge are in `order_payments`.
