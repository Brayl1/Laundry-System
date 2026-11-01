-- Laundry POS schema

create type public.user_role      as enum ('cashier', 'admin');
create type public.customer_type  as enum ('walk-in', 'returning');
create type public.service_type   as enum ('self-service', 'full-service');
create type public.payment_method as enum ('cash', 'qr');
create type public.order_status   as enum ('pending', 'washing', 'done', 'claimed');
create type public.machine_status as enum ('idle', 'in_use', 'maintenance');

-- ---------------------------------------------------------------- tables

create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  username     text not null unique,
  display_name text not null,
  role         public.user_role not null default 'cashier',
  created_at   timestamptz not null default now()
);

create table public.settings (
  id             smallint primary key default 1 check (id = 1),
  shop_name      text not null default 'Laundry POS',
  shop_subtitle  text not null default 'Triple V Laundry Shop',
  address        text not null default 'G&R Building, Bolonsiri Road',
  phone          text not null default '(02) 1234-5678',
  price_per_kg   numeric(10, 2) not null default 10 check (price_per_kg > 0),
  receipt_footer text not null default 'Thank you for your business!',
  updated_at     timestamptz not null default now()
);

create table public.addons (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  price      numeric(10, 2) not null check (price >= 0),
  active     boolean not null default true,
  sort       int not null default 0,
  created_at timestamptz not null default now()
);

create table public.machines (
  id         uuid primary key default gen_random_uuid(),
  label      text not null unique,
  status     public.machine_status not null default 'idle',
  created_at timestamptz not null default now()
);

create table public.customers (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  phone      text not null unique,
  created_at timestamptz not null default now()
);

create table public.orders (
  id             uuid primary key default gen_random_uuid(),
  code           text not null unique,
  customer_type  public.customer_type not null,
  customer_id    uuid references public.customers (id) on delete set null,
  service_type   public.service_type not null,
  weight_kg      numeric(10, 2) not null check (weight_kg > 0),
  price_per_kg   numeric(10, 2) not null,
  subtotal       numeric(10, 2) not null,
  total          numeric(10, 2) not null,
  payment_method public.payment_method not null,
  status         public.order_status not null default 'pending',
  machine_id     uuid references public.machines (id) on delete set null,
  cashier_id     uuid not null references public.profiles (id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint returning_needs_customer
    check (customer_type = 'walk-in' or customer_id is not null)
);

create index orders_created_at_idx on public.orders (created_at desc);
create index orders_status_idx on public.orders (status);

-- Name and price are snapshotted so later price edits never rewrite history.
create table public.order_addons (
  order_id uuid not null references public.orders (id) on delete cascade,
  addon_id uuid references public.addons (id) on delete set null,
  name     text not null,
  price    numeric(10, 2) not null,
  primary key (order_id, name)
);

-- ---------------------------------------------------------------- helpers

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- Every auth user gets a profile; username/display_name/role come from user metadata.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'cashier')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Finishing an order frees its machine.
create or replace function public.handle_order_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at := now();
  if new.status in ('done', 'claimed') and old.status not in ('done', 'claimed')
     and new.machine_id is not null then
    update public.machines set status = 'idle' where id = new.machine_id and status = 'in_use';
  end if;
  return new;
end;
$$;

create trigger on_order_status_change
  before update of status on public.orders
  for each row execute function public.handle_order_status();

-- ---------------------------------------------------------------- create_order RPC
-- payload: { customer_type, customer_id?, service_type, weight_kg, payment_method, addon_ids: uuid[] }
-- Totals are computed here from current settings and add-ons; the client total is display only.

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
  v_machine      uuid;
  v_order        public.orders;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if v_weight is null or v_weight <= 0 then
    raise exception 'Weight must be greater than zero';
  end if;

  select price_per_kg into v_price from public.settings where id = 1;

  select coalesce(sum(price), 0) into v_addons_total
  from public.addons where id = any (v_addon_ids) and active;

  if v_service = 'self-service' then
    select id into v_machine from public.machines
    where status = 'idle' order by label limit 1
    for update skip locked;
    if v_machine is null then
      raise exception 'No idle machine available for self-service';
    end if;
    update public.machines set status = 'in_use' where id = v_machine;
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

revoke execute on function public.create_order(jsonb) from anon, public;
grant execute on function public.create_order(jsonb) to authenticated;

-- ---------------------------------------------------------------- views

create view public.order_details
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
  ) as addons
from public.orders o
left join public.customers c on c.id = o.customer_id
left join public.machines  m on m.id = o.machine_id
left join public.profiles  p on p.id = o.cashier_id;

-- ---------------------------------------------------------------- RLS

alter table public.profiles     enable row level security;
alter table public.settings     enable row level security;
alter table public.addons       enable row level security;
alter table public.machines     enable row level security;
alter table public.customers    enable row level security;
alter table public.orders       enable row level security;
alter table public.order_addons enable row level security;

create policy "staff read profiles" on public.profiles for select to authenticated using (true);

create policy "staff read settings" on public.settings for select to authenticated using (true);
create policy "admin update settings" on public.settings for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "staff read addons" on public.addons for select to authenticated using (true);
create policy "admin write addons" on public.addons for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "staff read machines" on public.machines for select to authenticated using (true);
create policy "admin write machines" on public.machines for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "staff read customers" on public.customers for select to authenticated using (true);
create policy "staff add customers" on public.customers for insert to authenticated with check (true);

-- Orders are inserted only through create_order (security definer).
create policy "staff read orders" on public.orders for select to authenticated using (true);
create policy "staff update orders" on public.orders for update to authenticated
  using (true) with check (true);

create policy "staff read order addons" on public.order_addons for select to authenticated using (true);

-- Staff may only change an order's status, never its money fields.
revoke insert, update, delete on public.orders from authenticated, anon;
grant update (status) on public.orders to authenticated;
revoke insert, update, delete on public.order_addons from authenticated, anon;

-- ---------------------------------------------------------------- realtime

alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.machines;
