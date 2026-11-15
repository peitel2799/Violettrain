begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists public.admin_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  role text not null check (role in ('admin', 'operations', 'pricing', 'support')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.stations (
  id bigint generated always as identity primary key,
  code text not null unique check (code = upper(code) and code ~ '^[A-Z0-9]{2,10}$'),
  name_vi text not null,
  name_en text not null,
  active boolean not null default true,
  version bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.trains (
  id bigint generated always as identity primary key,
  train_number text not null unique check (train_number = upper(train_number) and train_number ~ '^[A-Z0-9-]{2,12}$'),
  name text not null,
  vip2_enabled boolean not null default false,
  active boolean not null default true,
  version bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trains_vip2_only_se19 check (not vip2_enabled or train_number = 'SE19')
);

create table if not exists public.routes (
  id bigint generated always as identity primary key,
  code text not null unique check (code = upper(code) and code ~ '^[A-Z0-9-]{3,24}$'),
  from_station_id bigint not null references public.stations(id),
  to_station_id bigint not null references public.stations(id),
  active boolean not null default true,
  version bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint routes_distinct_stations check (from_station_id <> to_station_id),
  constraint routes_station_pair_unique unique (from_station_id, to_station_id)
);

create table if not exists public.cabin_products (
  id bigint generated always as identity primary key,
  code text not null unique check (code in ('standard', 'premium')),
  name_vi text not null,
  name_en text not null,
  tickets_per_cabin smallint not null default 4 check (tickets_per_cabin = 4),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.service_templates (
  id bigint generated always as identity primary key,
  route_id bigint not null references public.routes(id),
  train_id bigint not null references public.trains(id),
  departure_time time not null,
  arrival_time time not null,
  arrival_day_offset smallint not null default 0 check (arrival_day_offset between 0 and 3),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint service_templates_business_key unique (
    route_id, train_id, departure_time, arrival_time, arrival_day_offset
  )
);

create table if not exists public.departures (
  id bigint generated always as identity primary key,
  service_template_id bigint not null references public.service_templates(id),
  service_date date not null,
  departure_at timestamptz not null,
  arrival_at timestamptz not null,
  status text not null default 'draft' check (status in ('draft', 'published', 'cancelled', 'departed')),
  version bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint departures_valid_times check (arrival_at > departure_at),
  constraint departures_template_date_unique unique (service_template_id, service_date)
);

create table if not exists public.departure_inventory (
  id bigint generated always as identity primary key,
  departure_id bigint not null references public.departures(id) on delete cascade,
  cabin_product_id bigint not null references public.cabin_products(id),
  capacity_cabins integer not null default 0 check (capacity_cabins >= 0),
  blocked_cabins integer not null default 0 check (blocked_cabins >= 0 and blocked_cabins <= capacity_cabins),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint departure_inventory_unique unique (departure_id, cabin_product_id)
);

create table if not exists public.departure_prices (
  id bigint generated always as identity primary key,
  departure_id bigint not null references public.departures(id) on delete cascade,
  cabin_product_id bigint not null references public.cabin_products(id),
  ticket_price_vnd bigint not null check (ticket_price_vnd > 0),
  cabin_price_vnd bigint generated always as (ticket_price_vnd * 4) stored,
  currency text not null default 'VND' check (currency = 'VND'),
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint departure_prices_unique unique (departure_id, cabin_product_id)
);

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_table text not null,
  entity_id text,
  before_data jsonb,
  after_data jsonb,
  correlation_id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create index if not exists routes_from_station_id_idx on public.routes(from_station_id);
create index if not exists routes_to_station_id_idx on public.routes(to_station_id);
create index if not exists service_templates_route_id_idx on public.service_templates(route_id);
create index if not exists service_templates_train_id_idx on public.service_templates(train_id);
create index if not exists departures_service_date_status_idx on public.departures(service_date, status, service_template_id);
create index if not exists departure_inventory_product_id_idx on public.departure_inventory(cabin_product_id);
create index if not exists departure_prices_product_id_idx on public.departure_prices(cabin_product_id);
create index if not exists admin_profiles_active_role_idx on public.admin_profiles(user_id, role) where active;
create index if not exists audit_logs_entity_idx on public.audit_logs(entity_table, entity_id, created_at desc);
create index if not exists audit_logs_actor_idx on public.audit_logs(actor_id, created_at desc);

create or replace function private.has_admin_role(allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_profiles profile
    where profile.user_id = (select auth.uid())
      and profile.active
      and profile.role = any(allowed_roles)
  );
$$;

grant usage on schema private to authenticated;
grant execute on function private.has_admin_role(text[]) to authenticated;

create or replace function private.touch_versioned_row()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  if tg_op = 'UPDATE' and to_jsonb(new) ? 'version' then
    new.version := old.version + 1;
  end if;
  return new;
end;
$$;

create or replace function private.audit_admin_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  row_before jsonb;
  row_after jsonb;
  row_id text;
begin
  row_before := case when tg_op = 'INSERT' then null else to_jsonb(old) end;
  row_after := case when tg_op = 'DELETE' then null else to_jsonb(new) end;
  row_id := coalesce(row_after ->> 'id', row_before ->> 'id');

  insert into public.audit_logs(actor_id, action, entity_table, entity_id, before_data, after_data)
  values ((select auth.uid()), lower(tg_op), tg_table_name, row_id, row_before, row_after);

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create or replace function private.validate_vip2_inventory()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  product_code text;
  departure_train text;
begin
  select product.code into product_code
  from public.cabin_products product
  where product.id = new.cabin_product_id;

  if product_code = 'premium' then
    select train.train_number into departure_train
    from public.departures departure
    join public.service_templates template on template.id = departure.service_template_id
    join public.trains train on train.id = template.train_id
    where departure.id = new.departure_id;

    if departure_train <> 'SE19' or new.capacity_cabins > 1 then
      raise exception 'VIP2 is available only on SE19 with capacity at most one';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists admin_profiles_touch on public.admin_profiles;
create trigger admin_profiles_touch before update on public.admin_profiles
for each row execute function private.touch_versioned_row();
drop trigger if exists stations_touch on public.stations;
create trigger stations_touch before update on public.stations
for each row execute function private.touch_versioned_row();
drop trigger if exists trains_touch on public.trains;
create trigger trains_touch before update on public.trains
for each row execute function private.touch_versioned_row();
drop trigger if exists routes_touch on public.routes;
create trigger routes_touch before update on public.routes
for each row execute function private.touch_versioned_row();
drop trigger if exists service_templates_touch on public.service_templates;
create trigger service_templates_touch before update on public.service_templates
for each row execute function private.touch_versioned_row();
drop trigger if exists departures_touch on public.departures;
create trigger departures_touch before update on public.departures
for each row execute function private.touch_versioned_row();
drop trigger if exists departure_inventory_touch on public.departure_inventory;
create trigger departure_inventory_touch before update on public.departure_inventory
for each row execute function private.touch_versioned_row();
drop trigger if exists departure_prices_touch on public.departure_prices;
create trigger departure_prices_touch before update on public.departure_prices
for each row execute function private.touch_versioned_row();

drop trigger if exists departure_inventory_validate_vip2 on public.departure_inventory;
create trigger departure_inventory_validate_vip2 before insert or update on public.departure_inventory
for each row execute function private.validate_vip2_inventory();

do $$
declare
  table_name text;
begin
  foreach table_name in array array['stations', 'trains', 'routes', 'service_templates', 'departures', 'departure_inventory', 'departure_prices']
  loop
    execute format('drop trigger if exists %I_audit on public.%I', table_name, table_name);
    execute format(
      'create trigger %I_audit after insert or update or delete on public.%I for each row execute function private.audit_admin_change()',
      table_name,
      table_name
    );
  end loop;
end;
$$;

insert into public.cabin_products(code, name_vi, name_en, tickets_per_cabin)
values
  ('standard', 'Cabin riêng 4 giường', 'Private 4-berth cabin', 4),
  ('premium', 'VIP2 cabin 4 vé', 'VIP2 4-ticket cabin', 4)
on conflict (code) do update set
  name_vi = excluded.name_vi,
  name_en = excluded.name_en,
  tickets_per_cabin = excluded.tickets_per_cabin;

create or replace function public.admin_upsert_departure(
  p_departure_id bigint,
  p_expected_version bigint,
  p_route_id bigint,
  p_train_id bigint,
  p_service_date date,
  p_departure_time time,
  p_arrival_time time,
  p_arrival_day_offset smallint,
  p_status text,
  p_standard_capacity integer,
  p_standard_ticket_price_vnd bigint,
  p_vip2_capacity integer,
  p_vip2_ticket_price_vnd bigint,
  p_reason text
)
returns bigint
language plpgsql
security invoker
set search_path = ''
as $$
declare
  template_id bigint;
  saved_departure_id bigint;
  standard_product_id bigint;
  premium_product_id bigint;
  selected_train_number text;
  affected_rows integer;
begin
  if not (select private.has_admin_role(array['admin', 'operations'])) then
    raise exception 'Admin role required';
  end if;
  if p_status not in ('draft', 'published', 'cancelled', 'departed') then
    raise exception 'Invalid departure status';
  end if;
  if p_arrival_day_offset not between 0 and 3 then
    raise exception 'Arrival day offset must be between 0 and 3';
  end if;
  if p_standard_capacity < 0 or p_standard_ticket_price_vnd <= 0 then
    raise exception 'Standard capacity and fare are invalid';
  end if;

  select train_number into selected_train_number
  from public.trains
  where id = p_train_id and active
  for share;
  if selected_train_number is null then raise exception 'Train not found'; end if;
  if p_vip2_capacity < 0 or p_vip2_capacity > 1 then raise exception 'VIP2 capacity must be zero or one'; end if;
  if p_vip2_capacity > 0 and selected_train_number <> 'SE19' then
    raise exception 'VIP2 is available only on SE19';
  end if;
  if p_vip2_capacity > 0 and p_vip2_ticket_price_vnd <= 0 then
    raise exception 'VIP2 fare is required';
  end if;

  insert into public.service_templates(route_id, train_id, departure_time, arrival_time, arrival_day_offset)
  values (p_route_id, p_train_id, p_departure_time, p_arrival_time, p_arrival_day_offset)
  on conflict (route_id, train_id, departure_time, arrival_time, arrival_day_offset)
  do update set active = true, updated_at = now()
  returning id into template_id;

  if p_departure_id is null then
    insert into public.departures(
      service_template_id, service_date, departure_at, arrival_at, status
    ) values (
      template_id,
      p_service_date,
      (p_service_date + p_departure_time) at time zone 'Asia/Ho_Chi_Minh',
      (p_service_date + p_arrival_day_offset + p_arrival_time) at time zone 'Asia/Ho_Chi_Minh',
      p_status
    ) returning id into saved_departure_id;
  else
    update public.departures
    set service_template_id = template_id,
        service_date = p_service_date,
        departure_at = (p_service_date + p_departure_time) at time zone 'Asia/Ho_Chi_Minh',
        arrival_at = (p_service_date + p_arrival_day_offset + p_arrival_time) at time zone 'Asia/Ho_Chi_Minh',
        status = p_status
    where id = p_departure_id and version = p_expected_version
    returning id into saved_departure_id;
    get diagnostics affected_rows = row_count;
    if affected_rows = 0 then
      raise exception 'This departure was changed by another administrator. Refresh and try again.';
    end if;
  end if;

  select id into standard_product_id from public.cabin_products where code = 'standard';
  select id into premium_product_id from public.cabin_products where code = 'premium';

  insert into public.departure_inventory(departure_id, cabin_product_id, capacity_cabins)
  values (saved_departure_id, standard_product_id, p_standard_capacity)
  on conflict (departure_id, cabin_product_id)
  do update set capacity_cabins = excluded.capacity_cabins;

  insert into public.departure_prices(departure_id, cabin_product_id, ticket_price_vnd, reason)
  values (saved_departure_id, standard_product_id, p_standard_ticket_price_vnd, nullif(trim(p_reason), ''))
  on conflict (departure_id, cabin_product_id)
  do update set ticket_price_vnd = excluded.ticket_price_vnd, reason = excluded.reason;

  if selected_train_number = 'SE19' and p_vip2_capacity > 0 then
    insert into public.departure_inventory(departure_id, cabin_product_id, capacity_cabins)
    values (saved_departure_id, premium_product_id, p_vip2_capacity)
    on conflict (departure_id, cabin_product_id)
    do update set capacity_cabins = excluded.capacity_cabins;

    insert into public.departure_prices(departure_id, cabin_product_id, ticket_price_vnd, reason)
    values (saved_departure_id, premium_product_id, p_vip2_ticket_price_vnd, nullif(trim(p_reason), ''))
    on conflict (departure_id, cabin_product_id)
    do update set ticket_price_vnd = excluded.ticket_price_vnd, reason = excluded.reason;
  else
    delete from public.departure_inventory
    where departure_id = saved_departure_id and cabin_product_id = premium_product_id;
    delete from public.departure_prices
    where departure_id = saved_departure_id and cabin_product_id = premium_product_id;
  end if;

  return saved_departure_id;
end;
$$;

revoke all on function public.admin_upsert_departure(bigint, bigint, bigint, bigint, date, time, time, smallint, text, integer, bigint, integer, bigint, text) from public, anon;
grant execute on function public.admin_upsert_departure(bigint, bigint, bigint, bigint, date, time, time, smallint, text, integer, bigint, integer, bigint, text) to authenticated;

alter table public.admin_profiles enable row level security;
alter table public.stations enable row level security;
alter table public.trains enable row level security;
alter table public.routes enable row level security;
alter table public.cabin_products enable row level security;
alter table public.service_templates enable row level security;
alter table public.departures enable row level security;
alter table public.departure_inventory enable row level security;
alter table public.departure_prices enable row level security;
alter table public.audit_logs enable row level security;

create policy admin_profiles_self_read on public.admin_profiles for select to authenticated
using (user_id = (select auth.uid()) and active);
create policy admin_profiles_admin_all on public.admin_profiles for all to authenticated
using ((select private.has_admin_role(array['admin'])))
with check ((select private.has_admin_role(array['admin'])));

create policy stations_admin_read on public.stations for select to authenticated
using ((select private.has_admin_role(array['admin', 'operations', 'pricing', 'support'])));
create policy stations_admin_write on public.stations for all to authenticated
using ((select private.has_admin_role(array['admin', 'operations'])))
with check ((select private.has_admin_role(array['admin', 'operations'])));
create policy trains_admin_read on public.trains for select to authenticated
using ((select private.has_admin_role(array['admin', 'operations', 'pricing', 'support'])));
create policy trains_admin_write on public.trains for all to authenticated
using ((select private.has_admin_role(array['admin', 'operations'])))
with check ((select private.has_admin_role(array['admin', 'operations'])));
create policy routes_admin_read on public.routes for select to authenticated
using ((select private.has_admin_role(array['admin', 'operations', 'pricing', 'support'])));
create policy routes_admin_write on public.routes for all to authenticated
using ((select private.has_admin_role(array['admin', 'operations'])))
with check ((select private.has_admin_role(array['admin', 'operations'])));
create policy cabin_products_admin_read on public.cabin_products for select to authenticated
using ((select private.has_admin_role(array['admin', 'operations', 'pricing', 'support'])));
create policy service_templates_admin_all on public.service_templates for all to authenticated
using ((select private.has_admin_role(array['admin', 'operations', 'pricing', 'support'])))
with check ((select private.has_admin_role(array['admin', 'operations'])));
create policy departures_admin_all on public.departures for all to authenticated
using ((select private.has_admin_role(array['admin', 'operations', 'pricing', 'support'])))
with check ((select private.has_admin_role(array['admin', 'operations'])));
create policy inventory_admin_all on public.departure_inventory for all to authenticated
using ((select private.has_admin_role(array['admin', 'operations', 'pricing', 'support'])))
with check ((select private.has_admin_role(array['admin', 'operations'])));
create policy prices_admin_all on public.departure_prices for all to authenticated
using ((select private.has_admin_role(array['admin', 'operations', 'pricing', 'support'])))
with check ((select private.has_admin_role(array['admin', 'operations', 'pricing'])));
create policy audit_logs_admin_read on public.audit_logs for select to authenticated
using ((select private.has_admin_role(array['admin'])));

revoke all on public.admin_profiles, public.stations, public.trains, public.routes,
  public.cabin_products, public.service_templates, public.departures,
  public.departure_inventory, public.departure_prices, public.audit_logs from anon, authenticated;
grant select on public.admin_profiles, public.stations, public.trains, public.routes,
  public.cabin_products, public.service_templates, public.departures,
  public.departure_inventory, public.departure_prices to authenticated;
grant insert, update on public.stations, public.trains, public.routes, public.service_templates,
  public.departures, public.departure_inventory, public.departure_prices to authenticated;
grant select on public.audit_logs to authenticated;
grant usage, select on sequence public.stations_id_seq, public.trains_id_seq,
  public.routes_id_seq, public.cabin_products_id_seq, public.service_templates_id_seq,
  public.departures_id_seq, public.departure_inventory_id_seq,
  public.departure_prices_id_seq to authenticated;

commit;
