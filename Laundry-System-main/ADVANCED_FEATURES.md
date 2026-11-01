# Advanced features

## Set up

```bash
npm run db:reset      # applies 20261101000000_advanced_features.sql and the updated seed
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
- Shelves are defined in `features/shelf/shelves.ts` (4 shelves x 4 bins). Edit the two lists to match the shop.
- Machine loads are counted when an order goes from Pending to Washing.
- The tracking page shows progress only (no name, phone or price). Order codes are time-based, so treat the link as semi-private.
- Not built: a separate "Drying" status (it needs a new order status through the whole app), and sending receipts to Viber or GCash directly (those have no simple public API for small shops). SMS covers the notification need.
