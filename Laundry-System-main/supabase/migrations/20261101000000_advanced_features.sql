-- Advanced features:
--   1. shelf locations on orders           4. supplies + machine maintenance counters
--   2. public order tracking (SMS link)    5. audit log
--   3. credit / partial payment ledger     6. SMS log

-- ---------------------------------------------------------------- 1. shelf locations

alter table public.orders
  add column shelf_location text check (shelf_location is null or char_length(shelf_location) <= 80);

-- Staff could only change `status` before; the shelf is the second field they may edit.
grant update (shelf_location) on public.orders to authenticated;

-- Same view as before with shelf_location appended (new columns must come last).
create or replace view public.order_details
with (security_invoker = true) as
select
  o.id,
  o.code,
  o.created_at,
  o.customer_type,
  o.customer_id,
  c.name  as customer_name,
  c.phone as customer_phone,
  o.service_type,
  o.weight_kg,
  o.price_per_kg,
  o.subtotal,
  o.total,
  o.payment_method,
  o.status,
  o.machine_id,
  m.label as machine_label,
  o.cashier_id,
  p.display_name as cashier_name,
  coalesce(
    (select jsonb_agg(jsonb_build_object('name', a.name, 'price', a.price) order by a.price)
     from public.order_addons a where a.order_id = o.id),
    '[]'::jsonb
  ) as addons,
  o.shelf_location
from public.orders o
left join public.customers c on c.id = o.customer_id
left join public.machines  m on m.id = o.machine_id
left join public.profiles  p on p.id = o.cashier_id;

-- ---------------------------------------------------------------- 2. public order tracking
-- The customer's SMS carries /track/<code>. This returns progress only: no name, phone, price or shelf.

create or replace function public.track_order(p_code text)
returns table (
  code         text,
  status       public.order_status,
  service_type public.service_type,
  created_at   timestamptz,
  updated_at   timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select o.code, o.status, o.service_type, o.created_at, o.updated_at
  from public.orders o
  where o.code = p_code;
$$;

revoke execute on function public.track_order(text) from public;
grant execute on function public.track_order(text) to anon, authenticated;

-- ---------------------------------------------------------------- 3. credit ledger (utang)

create type public.ledger_kind as enum ('charge', 'payment');

create table public.ledger_entries (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  kind        public.ledger_kind not null,
  amount      numeric(10, 2) not null check (amount > 0),
  due_date    date,
  note        text check (note is null or char_length(note) <= 200),
  created_by  uuid references public.profiles (id) default auth.uid(),
  created_at  timestamptz not null default now()
);

create index ledger_entries_customer_idx on public.ledger_entries (customer_id, created_at);

alter table public.ledger_entries enable row level security;

create policy "staff read ledger" on public.ledger_entries for select to authenticated
  using (public.is_staff());
create policy "staff add ledger entries" on public.ledger_entries for insert to authenticated
  with check (public.is_staff() and created_by = auth.uid());
-- Entries are never edited. Only an admin can delete one (and the audit log records it).
create policy "admin delete ledger entries" on public.ledger_entries for delete to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------- 4. supplies + maintenance

create table public.supplies (
  id            uuid primary key default gen_random_uuid(),
  name          text not null unique,
  unit          text not null default 'ml',
  stock         numeric(12, 2) not null default 0 check (stock >= 0),
  low_threshold numeric(12, 2) not null default 0 check (low_threshold >= 0),
  -- How much is used per kilo of laundry. 0 means "not deducted automatically".
  usage_per_kg  numeric(10, 2) not null default 0 check (usage_per_kg >= 0),
  created_at    timestamptz not null default now()
);

alter table public.supplies enable row level security;
create policy "staff read supplies" on public.supplies for select to authenticated using (true);
create policy "admin write supplies" on public.supplies for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

alter table public.machines
  add column loads_since_service int not null default 0 check (loads_since_service >= 0),
  add column service_every       int not null default 500 check (service_every > 0);

-- Starting a wash now also deducts supplies (per kg) and counts one load on the machine.
-- Only the pending -> washing step counts, so reopening a finished order never double-counts.
-- The machine bookkeeping is unchanged from the previous version of this function.
create or replace function public.handle_order_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at := now();
  if new.machine_id is not null then
    if new.status = 'washing' and old.status <> 'washing' then
      update public.machines set status = 'in_use'
      where id = new.machine_id
        and status in ('reserved', 'idle')
        and not exists (
          select 1 from public.orders o
          where o.machine_id = new.machine_id and o.id <> new.id and o.status in ('pending', 'washing')
        );
    elsif new.status = 'pending' and old.status = 'washing' then
      update public.machines set status = 'reserved' where id = new.machine_id and status = 'in_use';
    elsif new.status in ('done', 'claimed') and old.status not in ('done', 'claimed') then
      update public.machines set status = 'idle' where id = new.machine_id and status in ('in_use', 'reserved');
    end if;
  end if;

  if new.status = 'washing' and old.status = 'pending' then
    update public.supplies
    set stock = greatest(stock - usage_per_kg * new.weight_kg, 0)
    where usage_per_kg > 0;
    if new.machine_id is not null then
      update public.machines set loads_since_service = loads_since_service + 1 where id = new.machine_id;
    end if;
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------- 5. audit log

create table public.audit_log (
  id         bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  actor_id   uuid references public.profiles (id) on delete set null,
  action     text not null check (action in ('create', 'update', 'delete')),
  entity     text not null,
  record_id  text,
  summary    text not null,
  details    jsonb
);

create index audit_log_created_at_idx on public.audit_log (created_at desc);

alter table public.audit_log enable row level security;
create policy "admin read audit log" on public.audit_log for select to authenticated
  using (public.is_admin());
-- Nobody writes here directly; the trigger below does, as security definer.
revoke insert, update, delete on public.audit_log from authenticated, anon;

create or replace function public.log_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new     jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  v_old     jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  v_row     jsonb := coalesce(v_new, v_old);
  v_changed jsonb := '{}'::jsonb;
  v_summary text;
begin
  if tg_op = 'UPDATE' then
    select coalesce(jsonb_object_agg(n.key, jsonb_build_object('from', v_old -> n.key, 'to', n.value)), '{}'::jsonb)
    into v_changed
    from jsonb_each(v_new) n
    where n.key <> 'updated_at' and (v_old -> n.key) is distinct from n.value;
    -- Nothing but updated_at moved: not worth a log line.
    if v_changed = '{}'::jsonb then
      return null;
    end if;
  end if;

  v_summary := case tg_table_name
    when 'orders' then
      case tg_op
        when 'INSERT' then format('Created order %s (PHP %s)', v_row ->> 'code', v_row ->> 'total')
        when 'DELETE' then format('Deleted order %s', v_row ->> 'code')
        else
          case
            when v_changed ? 'status'
              then format('Order %s: %s to %s', v_row ->> 'code', v_old ->> 'status', v_new ->> 'status')
            when v_changed ? 'shelf_location'
              then format('Order %s stored at %s', v_row ->> 'code', coalesce(v_new ->> 'shelf_location', 'no shelf'))
            else format('Edited order %s', v_row ->> 'code')
          end
      end
    when 'ledger_entries' then
      case
        when tg_op = 'DELETE' then format('Deleted ledger %s of PHP %s', v_row ->> 'kind', v_row ->> 'amount')
        when v_row ->> 'kind' = 'payment' then format('Recorded payment of PHP %s', v_row ->> 'amount')
        else format('Added credit charge of PHP %s', v_row ->> 'amount')
      end
    when 'settings' then 'Changed shop settings'
    when 'addons' then format('%s add-on %s', case tg_op when 'INSERT' then 'Added' when 'DELETE' then 'Deleted' else 'Edited' end, v_row ->> 'name')
    when 'supplies' then format('%s supply %s', case tg_op when 'INSERT' then 'Added' when 'DELETE' then 'Deleted' else 'Updated' end, v_row ->> 'name')
    when 'profiles' then
      case
        when tg_op = 'INSERT' then format('Created staff account %s (%s)', v_row ->> 'username', v_row ->> 'role')
        when v_changed ? 'role' then format('Changed role of %s to %s', v_row ->> 'username', v_new ->> 'role')
        when v_changed ? 'active' then format('%s account %s', case when (v_new ->> 'active')::boolean then 'Reactivated' else 'Deactivated' end, v_row ->> 'username')
        else format('Edited staff account %s', v_row ->> 'username')
      end
    else format('%s %s', initcap(lower(tg_op)), tg_table_name)
  end;

  insert into public.audit_log (actor_id, action, entity, record_id, summary, details)
  values (
    auth.uid(),
    lower(tg_op),
    tg_table_name,
    v_row ->> 'id',
    v_summary,
    case tg_op when 'INSERT' then v_new when 'DELETE' then v_old else v_changed end
  );
  return null;
end;
$$;

create trigger audit_orders        after insert or update or delete on public.orders         for each row execute function public.log_audit();
create trigger audit_ledger        after insert or delete           on public.ledger_entries for each row execute function public.log_audit();
create trigger audit_settings      after update                     on public.settings       for each row execute function public.log_audit();
create trigger audit_addons        after insert or update or delete on public.addons         for each row execute function public.log_audit();
create trigger audit_supplies      after insert or update or delete on public.supplies       for each row execute function public.log_audit();
create trigger audit_profiles      after insert or update           on public.profiles       for each row execute function public.log_audit();

-- ---------------------------------------------------------------- 6. SMS log
-- The browser records each attempt after calling the send-sms edge function.

create table public.sms_log (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  kind        text not null check (kind in ('dropoff', 'ready', 'reminder')),
  recipient   text not null,
  message     text not null,
  status      text not null check (status in ('sent', 'failed')),
  error       text,
  order_id    uuid references public.orders (id) on delete set null,
  customer_id uuid references public.customers (id) on delete set null,
  sent_by     uuid references public.profiles (id) default auth.uid()
);

create index sms_log_created_at_idx on public.sms_log (created_at desc);

alter table public.sms_log enable row level security;
create policy "admin read sms log" on public.sms_log for select to authenticated using (public.is_admin());
create policy "staff add sms log" on public.sms_log for insert to authenticated
  with check (public.is_staff() and sent_by = auth.uid());
