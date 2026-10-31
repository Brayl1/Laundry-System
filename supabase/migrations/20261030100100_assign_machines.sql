-- Assign a washer when the order is created; it only becomes "in use" once the cashier approves.
--   create_order  : machine -> reserved   (order stays pending)
--   start_order   : cashier confirms the clothes are in -> order washing, machine in_use
--   order done/claimed -> machine idle (unchanged behaviour)

-- Orders created under the old rules hold an in-use machine while still pending.
update public.machines m
set status = 'reserved'
from public.orders o
where o.machine_id = m.id and o.status = 'pending' and m.status = 'in_use';

-- The machine follows the order's status, so changing status from anywhere keeps them in step.
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
      -- Approved: the clothes are in the machine. Never take a machine another live order holds.
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
  return new;
end;
$$;

-- payload: { customer_type, customer_id?, service_type, weight_kg, payment_method, addon_ids: uuid[], machine_id? }
-- Self-service orders must name a machine; full-service orders may leave it for start_order.
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
    subtotal, total, payment_method, machine_id, cashier_id
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

-- The cashier's approval: "the clothes are in the machine". Optionally switches to another free machine.
create or replace function public.start_order(p_order_id uuid, p_machine_id uuid default null)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order   public.orders;
  v_machine uuid;
  v_status  public.machine_status;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if not public.is_staff() then
    raise exception 'This account is deactivated';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Order not found';
  end if;
  if v_order.status <> 'pending' then
    raise exception 'This order has already been started';
  end if;

  v_machine := coalesce(p_machine_id, v_order.machine_id);
  if v_machine is null then
    raise exception 'Choose a washer to start washing';
  end if;

  select status into v_status from public.machines where id = v_machine for update;
  if not found then
    raise exception 'Washer not found';
  end if;

  if v_machine is distinct from v_order.machine_id then
    -- Switching washers: the new one must be free, and the one held for this order is released.
    if v_status <> 'idle' then
      raise exception 'That washer is not available';
    end if;
    if v_order.machine_id is not null then
      update public.machines set status = 'idle' where id = v_order.machine_id and status = 'reserved';
    end if;
  elsif v_status not in ('reserved', 'idle') then
    raise exception 'That washer is not available';
  end if;

  -- The status trigger flips the machine to in_use.
  update public.orders set machine_id = v_machine, status = 'washing'
  where id = p_order_id
  returning * into v_order;

  return v_order;
end;
$$;

revoke execute on function public.start_order(uuid, uuid) from anon, public;
grant execute on function public.start_order(uuid, uuid) to authenticated;
