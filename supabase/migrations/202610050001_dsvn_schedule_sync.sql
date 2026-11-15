begin;

alter table public.departures
  add column if not exists source text not null default 'manual',
  add column if not exists source_external_id text,
  add column if not exists source_synced_at timestamptz,
  add column if not exists source_payload_hash text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'departures_source_valid'
      and conrelid = 'public.departures'::regclass
  ) then
    alter table public.departures
      add constraint departures_source_valid check (source in ('manual', 'dsvn'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'departures_source_external_unique'
      and conrelid = 'public.departures'::regclass
  ) then
    alter table public.departures
      add constraint departures_source_external_unique unique (source, source_external_id);
  end if;
end;
$$;

create index if not exists departures_dsvn_sync_window_idx
  on public.departures(service_date, source, status)
  where source = 'dsvn';

create table if not exists public.schedule_sync_runs (
  id bigint generated always as identity primary key,
  source text not null check (source = 'dsvn'),
  trigger_type text not null check (trigger_type in ('cron', 'manual')),
  status text not null default 'running' check (status in ('running', 'succeeded', 'partial', 'failed')),
  window_start date not null,
  window_end date not null,
  requested_snapshots integer not null default 0 check (requested_snapshots >= 0),
  completed_snapshots integer not null default 0 check (completed_snapshots >= 0),
  fetched_departures integer not null default 0 check (fetched_departures >= 0),
  upserted_departures integer not null default 0 check (upserted_departures >= 0),
  cancelled_departures integer not null default 0 check (cancelled_departures >= 0),
  draft_departures integer not null default 0 check (draft_departures >= 0),
  error_summary text,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  constraint schedule_sync_runs_valid_window check (window_end >= window_start)
);

create index if not exists schedule_sync_runs_source_started_idx
  on public.schedule_sync_runs(source, started_at desc);

alter table public.schedule_sync_runs enable row level security;

drop policy if exists schedule_sync_runs_admin_read on public.schedule_sync_runs;
create policy schedule_sync_runs_admin_read on public.schedule_sync_runs
  for select to authenticated
  using ((select private.has_admin_role(array['admin', 'operations'])));

revoke all on public.schedule_sync_runs from public, anon, authenticated;
grant select on public.schedule_sync_runs to authenticated;

create or replace function public.apply_dsvn_route_snapshot(
  p_route_code text,
  p_service_date date,
  p_departures jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_route_id bigint;
  item record;
  selected_train_id bigint;
  selected_template_id bigint;
  saved_departure_id bigint;
  was_inserted boolean;
  upserted_count integer := 0;
  cancelled_count integer := 0;
  draft_count integer := 0;
begin
  if jsonb_typeof(p_departures) <> 'array' then
    raise exception 'DSVN snapshot must be a JSON array';
  end if;

  select route.id into selected_route_id
  from public.routes route
  where route.code = upper(trim(p_route_code)) and route.active;

  if selected_route_id is null then
    raise exception 'Active route % was not found', p_route_code;
  end if;

  for item in
    select *
    from jsonb_to_recordset(p_departures) as snapshot(
      external_id text,
      train_number text,
      departure_at timestamptz,
      arrival_at timestamptz,
      payload_hash text
    )
  loop
    item.train_number := upper(trim(item.train_number));
    if item.external_id is null or length(item.external_id) > 240 then
      raise exception 'Invalid DSVN external id';
    end if;
    if item.train_number !~ '^[A-Z0-9-]{2,12}$' then
      raise exception 'Invalid DSVN train number';
    end if;
    if item.arrival_at <= item.departure_at then
      raise exception 'Invalid DSVN departure times';
    end if;
    if (item.departure_at at time zone 'Asia/Ho_Chi_Minh')::date <> p_service_date then
      raise exception 'DSVN departure date does not match snapshot date';
    end if;

    insert into public.trains(train_number, name, vip2_enabled, active)
    values (item.train_number, 'Tàu ' || item.train_number, item.train_number = 'SE19', true)
    on conflict (train_number) do update set
      active = true,
      vip2_enabled = excluded.vip2_enabled
    returning id into selected_train_id;

    insert into public.service_templates(
      route_id, train_id, departure_time, arrival_time, arrival_day_offset, active
    ) values (
      selected_route_id,
      selected_train_id,
      (item.departure_at at time zone 'Asia/Ho_Chi_Minh')::time,
      (item.arrival_at at time zone 'Asia/Ho_Chi_Minh')::time,
      ((item.arrival_at at time zone 'Asia/Ho_Chi_Minh')::date -
       (item.departure_at at time zone 'Asia/Ho_Chi_Minh')::date)::smallint,
      true
    )
    on conflict (route_id, train_id, departure_time, arrival_time, arrival_day_offset)
    do update set active = true, updated_at = now()
    returning id into selected_template_id;

    select departure.id into saved_departure_id
    from public.departures departure
    where departure.source = 'dsvn'
      and departure.source_external_id = item.external_id
    for update;

    was_inserted := saved_departure_id is null;

    if saved_departure_id is null then
      select departure.id into saved_departure_id
      from public.departures departure
      where departure.service_template_id = selected_template_id
        and departure.service_date = p_service_date
      for update;
    end if;

    if saved_departure_id is null then
      insert into public.departures(
        service_template_id, service_date, departure_at, arrival_at, status,
        source, source_external_id, source_synced_at, source_payload_hash
      ) values (
        selected_template_id, p_service_date, item.departure_at, item.arrival_at, 'draft',
        'dsvn', item.external_id, now(), item.payload_hash
      ) returning id into saved_departure_id;
    else
      update public.departures
      set service_template_id = selected_template_id,
          service_date = p_service_date,
          departure_at = item.departure_at,
          arrival_at = item.arrival_at,
          source = 'dsvn',
          source_external_id = item.external_id,
          source_synced_at = now(),
          source_payload_hash = item.payload_hash,
          status = case when status = 'cancelled' then 'draft' else status end
      where id = saved_departure_id;
    end if;

    if was_inserted then
      insert into public.departure_inventory(departure_id, cabin_product_id, capacity_cabins, blocked_cabins)
      select saved_departure_id, latest.cabin_product_id, latest.capacity_cabins, 0
      from (
        select distinct on (inventory.cabin_product_id)
          inventory.cabin_product_id, inventory.capacity_cabins
        from public.departure_inventory inventory
        join public.departures departure on departure.id = inventory.departure_id
        join public.service_templates template on template.id = departure.service_template_id
        where template.route_id = selected_route_id
          and departure.id <> saved_departure_id
        order by inventory.cabin_product_id, departure.service_date desc, departure.id desc
      ) latest
      join public.cabin_products product on product.id = latest.cabin_product_id
      where product.code = 'standard' or item.train_number = 'SE19'
      on conflict (departure_id, cabin_product_id) do nothing;

      insert into public.departure_prices(departure_id, cabin_product_id, ticket_price_vnd, reason)
      select saved_departure_id, latest.cabin_product_id, latest.ticket_price_vnd,
             'Kế thừa giá gần nhất khi đồng bộ lịch DSVN'
      from (
        select distinct on (price.cabin_product_id)
          price.cabin_product_id, price.ticket_price_vnd
        from public.departure_prices price
        join public.departures departure on departure.id = price.departure_id
        join public.service_templates template on template.id = departure.service_template_id
        where template.route_id = selected_route_id
          and departure.id <> saved_departure_id
        order by price.cabin_product_id, departure.service_date desc, departure.id desc
      ) latest
      join public.cabin_products product on product.id = latest.cabin_product_id
      where product.code = 'standard' or item.train_number = 'SE19'
      on conflict (departure_id, cabin_product_id) do nothing;
    end if;

    if exists (
      select 1
      from public.departure_inventory inventory
      join public.departure_prices price
        on price.departure_id = inventory.departure_id
       and price.cabin_product_id = inventory.cabin_product_id
      join public.cabin_products product on product.id = inventory.cabin_product_id
      where inventory.departure_id = saved_departure_id
        and inventory.capacity_cabins > 0
        and product.code = 'standard'
    ) then
      update public.departures set status = 'published' where id = saved_departure_id;
    else
      update public.departures set status = 'draft' where id = saved_departure_id;
      draft_count := draft_count + 1;
    end if;

    upserted_count := upserted_count + 1;
  end loop;

  update public.departures departure
  set status = 'cancelled', source_synced_at = now()
  from public.service_templates template
  where departure.service_template_id = template.id
    and template.route_id = selected_route_id
    and departure.service_date = p_service_date
    and departure.source = 'dsvn'
    and departure.status in ('draft', 'published')
    and not exists (
      select 1
      from jsonb_array_elements(p_departures) snapshot
      where snapshot ->> 'external_id' = departure.source_external_id
    );
  get diagnostics cancelled_count = row_count;

  return jsonb_build_object(
    'upserted', upserted_count,
    'cancelled', cancelled_count,
    'draftWithoutFare', draft_count
  );
end;
$$;

revoke all on function public.apply_dsvn_route_snapshot(text, date, jsonb) from public, anon, authenticated;
grant execute on function public.apply_dsvn_route_snapshot(text, date, jsonb) to service_role;

commit;
