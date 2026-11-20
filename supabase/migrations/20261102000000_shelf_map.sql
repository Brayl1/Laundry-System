-- Shelf map as real tables.
--
-- Before: the racks were two lists in the code (shelves.ts) and each order stored free text such as
-- "Shelf 2, Bin B · blue bag". Nothing in the database knew what a shelf or a bin was.
--
-- After:
--   shelves       the racks (Shelf 1, Shelf 2, ...), editable by an admin
--   shelf_bins    the bins on each rack (A, B, C, ...), editable by an admin
--   orders.shelf_bin_id  which bin holds the bag, with a unique index so one bin holds one active order
--   orders.shelf_note    the free-text note ("blue bag"); this column used to be called shelf_location
--
-- order_details still exposes `shelf_location` (shelf, bin and note as one readable string), so tickets,
-- receipts and SMS texts keep working unchanged.

-- ---------------------------------------------------------------- 1. shelves and bins

create table public.shelves (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(btrim(name)) between 1 and 40),
  sort       int  not null default 0,
  created_at timestamptz not null default now()
);

create unique index shelves_name_key on public.shelves (lower(btrim(name)));

create table public.shelf_bins (
  id         uuid primary key default gen_random_uuid(),
  shelf_id   uuid not null references public.shelves (id) on delete cascade,
  name       text not null check (char_length(btrim(name)) between 1 and 20),
  sort       int  not null default 0,
  created_at timestamptz not null default now()
);

create unique index shelf_bins_name_key on public.shelf_bins (shelf_id, lower(btrim(name)));

alter table public.shelves enable row level security;
alter table public.shelf_bins enable row level security;

create policy "staff read shelves" on public.shelves for select to authenticated using (public.is_staff());
create policy "admin write shelves" on public.shelves for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "staff read shelf bins" on public.shelf_bins for select to authenticated using (public.is_staff());
create policy "admin write shelf bins" on public.shelf_bins for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- The layout the app used before: 4 shelves with bins A to D.
insert into public.shelves (name, sort)
select 'Shelf ' || n, n from generate_series(1, 4) as n
where not exists (select 1 from public.shelves);

insert into public.shelf_bins (shelf_id, name, sort)
select s.id, b.name, b.sort
from public.shelves s
cross join (values ('A', 1), ('B', 2), ('C', 3), ('D', 4)) as b (name, sort)
where not exists (select 1 from public.shelf_bins);

-- A bin that still holds a bag cannot be deleted (this also covers deleting its whole shelf).
create or replace function public.guard_bin_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from public.orders where shelf_bin_id = old.id and status <> 'claimed') then
    raise exception 'A bag is still in Bin %. Move it first.', old.name;
  end if;
  return old;
end;
$$;

-- ---------------------------------------------------------------- 2. orders point at a bin

alter table public.orders rename column shelf_location to shelf_note;
alter table public.orders add column shelf_bin_id uuid references public.shelf_bins (id) on delete set null;

create trigger shelf_bins_guard_delete before delete on public.shelf_bins
  for each row execute function public.guard_bin_delete();

-- Move existing "Shelf 2, Bin B · blue bag" text into the new columns. Only unclaimed orders occupy a bin,
-- and if two of them somehow claim the same one, only the newest keeps it (the rest keep their text as a note).
-- The audit trigger is paused so this clean-up does not flood the audit log.
alter table public.orders disable trigger audit_orders;

with parsed as (
  select
    o.id,
    b.id as bin_id,
    case when position(' · ' in o.shelf_note) > 0
         then nullif(btrim(substring(o.shelf_note from position(' · ' in o.shelf_note) + 3)), '')
    end as note,
    row_number() over (partition by b.id order by o.created_at desc) as rn
  from public.orders o
  join public.shelves s on true
  join public.shelf_bins b on b.shelf_id = s.id
  where o.shelf_note is not null
    and o.status <> 'claimed'
    and split_part(o.shelf_note, ' · ', 1) = s.name || ', Bin ' || b.name
)
update public.orders o
set shelf_bin_id = p.bin_id, shelf_note = p.note
from parsed p
where o.id = p.id and p.rn = 1;

alter table public.orders enable trigger audit_orders;

-- One active order per bin. Claimed orders keep their bin for the record but no longer occupy it.
create unique index orders_one_active_order_per_bin
  on public.orders (shelf_bin_id)
  where shelf_bin_id is not null and status <> 'claimed';

-- Staff could edit status and the shelf text; now they edit the bin and the note (shelf_note kept its grant).
grant update (shelf_bin_id) on public.orders to authenticated;

-- ---------------------------------------------------------------- 3. the view

-- Same columns as before. `shelf_location` is now built from the tables, so renaming a shelf or bin shows up
-- everywhere at once. New columns go last.
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
  case
    when sb.id is not null
      then sh.name || ', Bin ' || sb.name || coalesce(' · ' || nullif(btrim(o.shelf_note), ''), '')
    else o.shelf_note
  end as shelf_location,
  o.shelf_bin_id,
  o.shelf_note
from public.orders o
left join public.customers  c  on c.id  = o.customer_id
left join public.machines   m  on m.id  = o.machine_id
left join public.profiles   p  on p.id  = o.cashier_id
left join public.shelf_bins sb on sb.id = o.shelf_bin_id
left join public.shelves    sh on sh.id = sb.shelf_id;

-- ---------------------------------------------------------------- 4. audit log wording
-- Same function as before; only the "stored at" line changed, because the shelf is now two columns.

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

-- ---------------------------------------------------------------- 5. live updates

alter publication supabase_realtime add table public.shelves;
alter publication supabase_realtime add table public.shelf_bins;
