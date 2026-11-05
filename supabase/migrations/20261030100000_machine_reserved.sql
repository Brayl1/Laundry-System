-- A machine can now be assigned to an order before the clothes are loaded.
-- This is its own migration because Postgres cannot use a new enum value in the transaction that adds it.
alter type public.machine_status add value if not exists 'reserved' after 'idle';
