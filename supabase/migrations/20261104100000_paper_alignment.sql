-- Aligns the database with the revised design in the PIT paper (answers to the instructor's questions):
--   1. storage charge  : calculated while an order is Ready, saved once when it is Claimed        (BR16, BR20)
--   2. payments        : an order has zero, one or many payments, and balance = amount due - paid  (BR18, BR19, BR20)
--   3. machine use     : each wash or dry cycle of an order is a row, so one order can use a washer and a dryer (BR24)
--   4. stock movements : every deduction and restock is a row, and a trigger keeps the stock on hand (BR25)
--   5. audit log       : audit_log already is its own table filled by triggers; payments are now logged too (BR30)
--   6. no stored total : the stored price is orders.subtotal (price incl. add-ons, before the storage charge);
--                        the amount due is calculated (BR3, BR20)
--   7. drying stage    : orders can be Drying, and a dryer cycle is recorded when an order moves there (BR4, BR24)
-- Built on top of 20261102000000_shelf_map.sql and 20261104000000_drying_status.sql.

-- ---------------------------------------------------------------- 0. no stored total
-- Before: subtotal = weight x rate, total = subtotal + add-ons. Now the stored columns are
--   wash_amount = weight x rate        subtotal = wash_amount + add-ons (saved once, when the order is saved)
-- There is no stored total any more. order_details still exposes subtotal (= wash_amount) and total (= the price
-- before the storage charge) under the same names, so the screens keep working; the amount due adds the storage charge.
alter table public.orders rename column subtotal to wash_amount;
alter table public.orders rename column total to subtotal;

-- ---------------------------------------------------------------- 1. storage charge

alter table public.orders
  add column ready_at    timestamptz,
  add column claimed_at  timestamptz,
  add column storage_fee numeric(10, 2) not null default 0 check (storage_fee >= 0);

-- Finished orders get the best time we have. The audit trigger is paused so this one-time backfill
-- does not fill the audit log with "Edited order" lines.
alter table public.orders disable trigger audit_orders;
update public.orders set ready_at = updated_at where status in ('done', 'claimed') and ready_at is null;
update public.orders set claimed_at = updated_at where status = 'claimed' and claimed_at is null;
alter table public.orders enable trigger audit_orders;

-- 2 free days, then PHP 10 per day, counted in calendar days in the shop's time zone.
create or replace function public.storage_fee_for(p_ready timestamptz, p_until timestamptz)
returns numeric
language sql
immutable
as $$
  select case
    when p_ready is null then 0::numeric
    else 10::numeric * greatest(
      0,
      ((p_until at time zone 'Asia/Manila')::date - (p_ready at time zone 'Asia/Manila')::date) - 2
    )
  end;
$$;

-- ---------------------------------------------------------------- 2. payments

create table public.order_payments (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references public.orders (id) on delete restrict,
  amount       numeric(10, 2) not null check (amount > 0),
  method       text not null check (method in ('cash', 'qr')),
  reference_no text check (reference_no is null or char_length(reference_no) <= 50),
  received_by  uuid references public.profiles (id) default auth.uid(),
  created_at   timestamptz not null default now()
);

create index order_payments_order_idx on public.order_payments (order_id);

alter table public.order_payments enable row level security;
create policy "staff read payments" on public.order_payments for select to authenticated using (public.is_staff());
create policy "staff record payments" on public.order_payments for insert to authenticated
  with check (public.is_staff() and received_by = auth.uid());
-- Payments are never edited or deleted. An order that has payments cannot be deleted (on delete restrict).

-- Every order so far was paid in full at the counter by its payment method (its subtotal, as saved).
insert into public.order_payments (order_id, amount, method, received_by, created_at)
select id, subtotal, payment_method::text, cashier_id, created_at
from public.orders
where subtotal > 0;

-- Payment First: a new order starts with one payment of its total. Later payments (for example the storage
-- charge at pickup) are extra rows, and an order saved on credit simply has none.
create or replace function public.record_first_payment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.subtotal > 0 then
    insert into public.order_payments (order_id, amount, method, received_by)
    values (new.id, new.subtotal, new.payment_method::text, coalesce(new.cashier_id, auth.uid()));
  end if;
  return null;
end;
$$;

create trigger orders_first_payment
  after insert on public.orders
  for each row execute function public.record_first_payment();

-- ---------------------------------------------------------------- 3. machine use

alter table public.machines
  add column machine_type text not null default 'washer' check (machine_type in ('washer', 'dryer')),
  add column last_serviced_date date;

create table public.order_machine_uses (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references public.orders (id) on delete cascade,
  machine_id uuid not null references public.machines (id) on delete restrict,
  cycle_type text not null check (cycle_type in ('wash', 'dry')),
  started_at timestamptz not null default now(),
  ended_at   timestamptz check (ended_at is null or ended_at >= started_at)
);

create index order_machine_uses_order_idx on public.order_machine_uses (order_id);
create index order_machine_uses_machine_idx on public.order_machine_uses (machine_id);

alter table public.order_machine_uses enable row level security;
create policy "staff read machine uses" on public.order_machine_uses for select to authenticated using (public.is_staff());
create policy "staff add machine uses" on public.order_machine_uses for insert to authenticated with check (public.is_staff());
create policy "staff close machine uses" on public.order_machine_uses for update to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- ---------------------------------------------------------------- 4. stock movements

create table public.stock_movements (
  id            uuid primary key default gen_random_uuid(),
  supply_id     uuid not null references public.supplies (id) on delete restrict,
  order_id      uuid references public.orders (id) on delete set null,
  user_id       uuid references public.profiles (id) default auth.uid(),
  movement_type text not null check (movement_type in ('usage', 'restock', 'adjustment')),
  -- Negative = used, positive = added.
  quantity      numeric(12, 2) not null check (quantity <> 0),
  created_at    timestamptz not null default now()
);

create index stock_movements_supply_idx on public.stock_movements (supply_id, created_at desc);

alter table public.stock_movements enable row level security;
create policy "staff read stock movements" on public.stock_movements for select to authenticated using (public.is_staff());
-- Staff record deliveries; only the owner records corrections. Usage rows are written by the order trigger below.
create policy "staff record restocks" on public.stock_movements for insert to authenticated
  with check (public.is_staff() and movement_type = 'restock' and quantity > 0 and user_id = auth.uid());
create policy "admin record adjustments" on public.stock_movements for insert to authenticated
  with check (public.is_admin() and movement_type in ('restock', 'adjustment') and user_id = auth.uid());

-- The stock on hand is only ever changed here, so it always equals the sum of its movements.
create or replace function public.apply_stock_movement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.supplies set stock = greatest(stock + new.quantity, 0) where id = new.supply_id;
  return null;
end;
$$;

create trigger stock_movement_applies
  after insert on public.stock_movements
  for each row execute function public.apply_stock_movement();

-- ---------------------------------------------------------------- create_order
-- Same function as in 20261030100100_assign_machines.sql; it saves wash_amount and subtotal (there is no total column).

create or replace function public.create_order(payload jsonb)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_price        numeric;
  v_weight       numeric := (payload ->> 'weight_kg')::numeric;
  v_service      public.service_type := (payload ->> 'service_type')::public.service_type;
  v_addon_ids    uuid[] := coalesce(
    (select array_agg(value::uuid) from jsonb_array_elements_text(payload -> 'addon_ids')),
    '{}'
  );
  v_addons_total numeric;
  v_machine      uuid := nullif(payload ->> 'machine_id', '')::uuid;
  v_order        public.orders;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if not public.is_staff() then
    raise exception 'This account is deactivated';
  end if;
  if v_weight is null or v_weight <= 0 then
    raise exception 'Weight must be greater than zero';
  end if;

  select price_per_kg into v_price from public.settings where id = 1;

  select coalesce(sum(price), 0) into v_addons_total
  from public.addons where id = any (v_addon_ids) and active;

  if v_machine is not null then
    -- Lock the machine so two tills cannot hand it to different orders.
    perform 1 from public.machines where id = v_machine and status = 'idle' for update;
    if not found then
      raise exception 'That washer was just taken. Go back and choose another one';
    end if;
    update public.machines set status = 'reserved' where id = v_machine;
  elsif v_service = 'self-service' then
    raise exception 'Choose a washer for self-service orders';
  end if;

  insert into public.orders (
    code, customer_type, customer_id, service_type, weight_kg, price_per_kg,
    wash_amount, subtotal, payment_method, machine_id, cashier_id
  ) values (
    'ORD-' || (extract(epoch from clock_timestamp()) * 1000)::bigint,
    (payload ->> 'customer_type')::public.customer_type,
    nullif(payload ->> 'customer_id', '')::uuid,
    v_service,
    v_weight,
    v_price,
    round(v_weight * v_price, 2),
    round(v_weight * v_price, 2) + v_addons_total,
    (payload ->> 'payment_method')::public.payment_method,
    v_machine,
    auth.uid()
  )
  returning * into v_order;

  insert into public.order_addons (order_id, addon_id, name, price)
  select v_order.id, id, name, price
  from public.addons where id = any (v_addon_ids) and active;

  return v_order;
end;
$$;


-- ---------------------------------------------------------------- order status trigger
-- Same machine bookkeeping as before, with the Drying stage: the washer is freed when the order leaves washing, and
-- a dryer is freed when the order is done. Usage is saved as stock movements, a wash is saved as a machine use, and
-- the ready time, claimed time and final storage fee are set when the status changes.

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
    elsif new.status not in ('pending', 'washing') and old.status in ('pending', 'washing') then
      -- Leaving the washer (to drying, done or claimed).
      update public.machines set status = 'idle' where id = new.machine_id and status in ('in_use', 'reserved');
    end if;
  end if;

  -- Starting a wash: deduct supplies, count the load, and record the machine use.
  if new.status = 'washing' and old.status = 'pending' then
    insert into public.stock_movements (supply_id, order_id, user_id, movement_type, quantity)
    select s.id, new.id, auth.uid(), 'usage', -round(s.usage_per_kg * new.weight_kg, 2)
    from public.supplies s
    where s.usage_per_kg > 0 and round(s.usage_per_kg * new.weight_kg, 2) > 0;

    if new.machine_id is not null then
      update public.machines set loads_since_service = loads_since_service + 1 where id = new.machine_id;
      insert into public.order_machine_uses (order_id, machine_id, cycle_type) values (new.id, new.machine_id, 'wash');
    end if;
  end if;

  -- The wash cycle ends when the order leaves washing.
  if new.status not in ('pending', 'washing') and old.status in ('pending', 'washing') then
    update public.order_machine_uses set ended_at = now()
    where order_id = new.id and cycle_type = 'wash' and ended_at is null;
  end if;

  if new.status = 'done' and old.status <> 'done' then
    new.ready_at := coalesce(new.ready_at, now());
  end if;

  -- Done or claimed: any dry cycle that is still running ends and its dryer is free again.
  if new.status in ('done', 'claimed') and old.status not in ('done', 'claimed') then
    update public.machines set status = 'idle'
    where status in ('in_use', 'reserved')
      and id in (
        select machine_id from public.order_machine_uses
        where order_id = new.id and cycle_type = 'dry' and ended_at is null
      );
    update public.order_machine_uses set ended_at = now() where order_id = new.id and ended_at is null;
  end if;

  if new.status = 'claimed' and old.status <> 'claimed' then
    new.claimed_at := now();
    new.storage_fee := public.storage_fee_for(new.ready_at, now());
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------- drying
-- Moves a washing order to Drying and, if a dryer is chosen, records the dry cycle on that dryer (BR24).
create or replace function public.start_drying(p_order_id uuid, p_machine_id uuid default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status         public.order_status;
  v_type           text;
  v_machine_status public.machine_status;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if not public.is_staff() then
    raise exception 'This account is deactivated';
  end if;

  select status into v_status from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Order not found';
  end if;
  if v_status <> 'washing' then
    raise exception 'Only an order that is washing can move to drying';
  end if;

  if p_machine_id is not null then
    select machine_type, status into v_type, v_machine_status from public.machines where id = p_machine_id for update;
    if not found then
      raise exception 'Dryer not found';
    end if;
    if v_type <> 'dryer' then
      raise exception 'That machine is not a dryer';
    end if;
    if v_machine_status <> 'idle' then
      raise exception 'That dryer is not free';
    end if;
    update public.machines set status = 'in_use', loads_since_service = loads_since_service + 1 where id = p_machine_id;
    insert into public.order_machine_uses (order_id, machine_id, cycle_type) values (p_order_id, p_machine_id, 'dry');
  end if;

  update public.orders set status = 'drying' where id = p_order_id;
end;
$$;

grant execute on function public.start_drying(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------- views

-- order_details keeps every column from the shelf-map migration (subtotal = weight x rate, total = the price before the
-- storage charge) and adds three at the end: when the order became Ready, its storage charge, and what has been paid. While Ready the charge is calculated each time; once Claimed it is the saved storage_fee.
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
  o.wash_amount as subtotal,
  o.subtotal as total,
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
  case
    when sb.id is not null
      then sh.name || ', Bin ' || sb.name || coalesce(' · ' || nullif(btrim(o.shelf_note), ''), '')
    else o.shelf_note
  end as shelf_location,
  o.shelf_bin_id,
  o.shelf_note,
  o.ready_at,
  case
    when o.status = 'claimed' then o.storage_fee
    when o.status = 'done' then public.storage_fee_for(o.ready_at, now())
    else 0::numeric
  end as storage_charge,
  coalesce((select sum(op.amount) from public.order_payments op where op.order_id = o.id), 0) as amount_paid
from public.orders o
left join public.customers  c  on c.id  = o.customer_id
left join public.machines   m  on m.id  = o.machine_id
left join public.profiles   p  on p.id  = o.cashier_id
left join public.shelf_bins sb on sb.id = o.shelf_bin_id
left join public.shelves    sh on sh.id = sb.shelf_id;

-- What every order costs and what is still owed (BR20): amount due = price + storage charge,
-- balance = amount due - the sum of its payments.
create or replace view public.order_balances
with (security_invoker = true) as
select
  d.id as order_id,
  d.code,
  d.status,
  d.total as order_total,
  d.storage_charge,
  d.total + d.storage_charge as amount_due,
  d.amount_paid,
  d.total + d.storage_charge - d.amount_paid as balance
from public.order_details d;

-- ---------------------------------------------------------------- audit log
-- Same function as in the shelf-map migration, plus one line for payments.

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
        when 'INSERT' then format('Created order %s (PHP %s)', v_row ->> 'code', v_row ->> 'subtotal')
        when 'DELETE' then format('Deleted order %s', v_row ->> 'code')
        else
          case
            when v_changed ? 'status'
              then format('Order %s: %s to %s', v_row ->> 'code', v_old ->> 'status', v_new ->> 'status')
            when v_changed ? 'shelf_bin_id' or v_changed ? 'shelf_note'
              then format(
                'Order %s stored at %s',
                v_row ->> 'code',
                coalesce(
                  (select s.name || ', Bin ' || b.name
                   from public.shelf_bins b join public.shelves s on s.id = b.shelf_id
                   where b.id = nullif(v_new ->> 'shelf_bin_id', '')::uuid),
                  v_new ->> 'shelf_note',
                  'no shelf'
                )
              )
            else format('Edited order %s', v_row ->> 'code')
          end
      end
    when 'ledger_entries' then
      case
        when tg_op = 'DELETE' then format('Deleted ledger %s of PHP %s', v_row ->> 'kind', v_row ->> 'amount')
        when v_row ->> 'kind' = 'payment' then format('Recorded payment of PHP %s', v_row ->> 'amount')
        else format('Added credit charge of PHP %s', v_row ->> 'amount')
      end
    when 'order_payments' then format('Recorded payment of PHP %s', v_row ->> 'amount')
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
    case tg_op when 'INSERT' then 'create' when 'DELETE' then 'delete' else 'update' end,
    tg_table_name,
    v_row ->> 'id',
    v_summary,
    case tg_op when 'INSERT' then v_new when 'DELETE' then v_old else v_changed end
  );
  return null;
end;
$$;

create trigger audit_payments after insert on public.order_payments
  for each row execute function public.log_audit();
