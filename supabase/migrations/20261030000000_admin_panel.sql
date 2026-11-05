-- Admin panel: staff management, account deactivation, customer stats.

-- ---------------------------------------------------------------- profiles.active

alter table public.profiles add column active boolean not null default true;

-- Deactivated admins lose their rights immediately.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin' and active
  );
$$;

-- Any active staff member (cashier or admin).
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and active);
$$;

-- Writes that staff can make now require an active account. A deactivated user is also banned
-- in Supabase Auth (see admin_set_staff_active), but an access token stays valid until it expires.
drop policy "staff update orders" on public.orders;
create policy "staff update orders" on public.orders for update to authenticated
  using (public.is_staff()) with check (public.is_staff());

drop policy "staff add customers" on public.customers;
create policy "staff add customers" on public.customers for insert to authenticated
  with check (public.is_staff());

-- create_order is unchanged except for the active-account guard at the top.
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
  if not public.is_staff() then
    raise exception 'This account is deactivated';
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

-- ---------------------------------------------------------------- staff management RPCs
-- Staff accounts live in auth.users, which the browser cannot touch, so admins manage them
-- through these security-definer functions. Each one checks is_admin() itself.

create or replace function public.admin_create_staff(
  p_username     text,
  p_display_name text,
  p_password     text,
  p_role         public.user_role
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id       uuid := gen_random_uuid();
  v_username text := lower(trim(p_username));
  v_name     text := trim(p_display_name);
  v_email    text;
begin
  if not public.is_admin() then
    raise exception 'Only admins can manage staff';
  end if;
  if v_username !~ '^[a-z0-9._-]{3,32}$' then
    raise exception 'Username must be 3-32 characters: letters, numbers, dot, dash or underscore';
  end if;
  if v_name = '' then
    raise exception 'Display name is required';
  end if;
  if length(p_password) < 6 then
    raise exception 'Password must be at least 6 characters';
  end if;
  if exists (select 1 from public.profiles where username = v_username) then
    raise exception 'That username is already taken';
  end if;

  v_email := v_username || '@laundry.local';

  -- Same shape as supabase/seed.sql. The on_auth_user_created trigger creates the profile.
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values (
    '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
    v_email,
    extensions.crypt(p_password, extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('username', v_username, 'display_name', v_name, 'role', p_role),
    now(), now(), '', '', '', ''
  );

  insert into auth.identities (
    id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(), v_id, v_id::text,
    jsonb_build_object('sub', v_id::text, 'email', v_email, 'email_verified', true),
    'email', now(), now(), now()
  );
end;
$$;

create or replace function public.admin_set_staff_role(p_id uuid, p_role public.user_role)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can manage staff';
  end if;
  if p_id = auth.uid() then
    raise exception 'You cannot change your own role';
  end if;
  update public.profiles set role = p_role where id = p_id;
  if not found then
    raise exception 'Staff member not found';
  end if;
end;
$$;

-- Deactivating also bans the auth user, so they cannot sign in or refresh their session.
create or replace function public.admin_set_staff_active(p_id uuid, p_active boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can manage staff';
  end if;
  if p_id = auth.uid() then
    raise exception 'You cannot deactivate your own account';
  end if;
  update public.profiles set active = p_active where id = p_id;
  if not found then
    raise exception 'Staff member not found';
  end if;
  update auth.users
  set banned_until = case when p_active then null else now() + interval '100 years' end
  where id = p_id;
end;
$$;

create or replace function public.admin_reset_staff_password(p_id uuid, p_password text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can manage staff';
  end if;
  if length(p_password) < 6 then
    raise exception 'Password must be at least 6 characters';
  end if;
  update auth.users
  set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')), updated_at = now()
  where id = p_id;
  if not found then
    raise exception 'Staff member not found';
  end if;
end;
$$;

revoke execute on function public.admin_create_staff(text, text, text, public.user_role) from anon, public;
revoke execute on function public.admin_set_staff_role(uuid, public.user_role) from anon, public;
revoke execute on function public.admin_set_staff_active(uuid, boolean) from anon, public;
revoke execute on function public.admin_reset_staff_password(uuid, text) from anon, public;
grant execute on function public.admin_create_staff(text, text, text, public.user_role) to authenticated;
grant execute on function public.admin_set_staff_role(uuid, public.user_role) to authenticated;
grant execute on function public.admin_set_staff_active(uuid, boolean) to authenticated;
grant execute on function public.admin_reset_staff_password(uuid, text) to authenticated;

-- ---------------------------------------------------------------- customer stats

create view public.customer_stats
with (security_invoker = true) as
select
  c.id,
  c.name,
  c.phone,
  c.created_at,
  count(o.id)::int                  as order_count,
  coalesce(sum(o.total), 0)         as total_spent,
  max(o.created_at)                 as last_order_at
from public.customers c
left join public.orders o on o.customer_id = c.id
group by c.id;
