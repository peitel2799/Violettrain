-- DSVN per-date timetable + fare sync.
--
-- The sync now reads DSVN's public per-date pages ("Giờ tàu" / "Giá vé" on
-- giotaugiave.dsvn.vn) instead of projecting one static timetable. This adds:
--   1. departures.source_projected: dates DSVN has not opened yet are filled
--      from the recent daily pattern and are never auto-published.
--   2. Sync run counters for fares/projection and a 'script' trigger.
--   3. dsvn_sync_dates: per-date freshness so the nightly job can rotate work.
--   4. apply_dsvn_route_snapshot(p_projected): projection never overwrites real
--      DSVN data; new departures inherit price/capacity only from the same train.
--   5. upsert_dsvn_fares_batch: one call per service date.
--   6. admin_schedule_calendar exposes the projected flag.

begin;

-- ---------------------------------------------------------------------------
-- 1. Projected departures
-- ---------------------------------------------------------------------------
alter table public.departures
  add column if not exists source_projected boolean not null default false;

-- ---------------------------------------------------------------------------
-- 2. Sync run log
-- ---------------------------------------------------------------------------
alter table public.schedule_sync_runs drop constraint if exists schedule_sync_runs_trigger_type_check;
alter table public.schedule_sync_runs
  add constraint schedule_sync_runs_trigger_type_check check (trigger_type in ('cron', 'manual', 'script'));
alter table public.schedule_sync_runs
  add column if not exists fare_dates integer not null default 0 check (fare_dates >= 0),
  add column if not exists fare_rows integer not null default 0 check (fare_rows >= 0),
  add column if not exists projected_departures integer not null default 0 check (projected_departures >= 0),
  add column if not exists dsvn_horizon date;

-- ---------------------------------------------------------------------------
-- 3. Per-date sync state
-- ---------------------------------------------------------------------------
create table if not exists public.dsvn_sync_dates (
  service_date date primary key,
  dsvn_open boolean not null default false,
  train_count integer not null default 0 check (train_count >= 0),
  timetable_synced_at timestamptz,
  projected_at timestamptz,
  fares_synced_at timestamptz,
  fare_rows integer not null default 0 check (fare_rows >= 0),
  last_error text,
  updated_at timestamptz not null default now()
);

alter table public.dsvn_sync_dates enable row level security;
drop policy if exists dsvn_sync_dates_admin_read on public.dsvn_sync_dates;
create policy dsvn_sync_dates_admin_read on public.dsvn_sync_dates for select to authenticated
using ((select private.has_admin_role(array['admin', 'operations', 'pricing', 'support'])));
revoke all on public.dsvn_sync_dates from public, anon, authenticated;
grant select on public.dsvn_sync_dates to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Snapshot apply with projection support
-- ---------------------------------------------------------------------------
drop function if exists public.apply_dsvn_route_snapshot(text, date, jsonb);

create or replace function public.apply_dsvn_route_snapshot(
  p_route_code text,
  p_service_date date,
  p_departures jsonb,
  p_projected boolean default false
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
  saved_override boolean;
  was_inserted boolean;
  upserted_count integer := 0;
  cancelled_count integer := 0;
  draft_count integer := 0;
  existing_active integer := 0;
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

  -- A projection is only a placeholder: once DSVN has published real data for
  -- this route/date, never replace it with a guess.
  if p_projected and exists (
    select 1
    from public.departures departure
    join public.service_templates template on template.id = departure.service_template_id
    where template.route_id = selected_route_id
      and departure.service_date = p_service_date
      and departure.source = 'dsvn'
      and not departure.source_projected
      and departure.status in ('draft', 'published')
  ) then
    return jsonb_build_object('upserted', 0, 'cancelled', 0, 'draftWithoutFare', 0, 'skipped', true);
  end if;

  -- Safety net against a changed or half-broken DSVN page: never let an empty
  -- or sharply shrunken snapshot cancel departures that are already on sale.
  select count(*) into existing_active
  from public.departures departure
  join public.service_templates template on template.id = departure.service_template_id
  where template.route_id = selected_route_id
    and departure.service_date = p_service_date
    and departure.source = 'dsvn'
    and departure.status in ('draft', 'published');

  if existing_active > 0 and jsonb_array_length(p_departures) = 0 then
    raise exception 'DSVN snapshot for % on % is empty; % existing departures kept', p_route_code, p_service_date, existing_active;
  end if;
  if existing_active >= 4 and jsonb_array_length(p_departures) * 2 < existing_active then
    raise exception 'DSVN snapshot for % on % dropped from % to % trains; not applied, please review', p_route_code, p_service_date, existing_active, jsonb_array_length(p_departures);
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
      raise exception 'Invalid DSVN train number %', item.train_number;
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

    saved_departure_id := null;

    select departure.id into saved_departure_id
    from public.departures departure
    where departure.source = 'dsvn'
      and departure.source_external_id = item.external_id
    for update;

    if saved_departure_id is null then
      select departure.id into saved_departure_id
      from public.departures departure
      where departure.service_template_id = selected_template_id
        and departure.service_date = p_service_date
      for update;
    end if;

    if saved_departure_id is null then
      -- Staff may have created this train/date in advance with slightly
      -- different times; adopt it so its fare and status are preserved.
      select departure.id into saved_departure_id
      from public.departures departure
      join public.service_templates template on template.id = departure.service_template_id
      where template.route_id = selected_route_id
        and template.train_id = selected_train_id
        and departure.service_date = p_service_date
        and departure.source = 'manual'
      order by departure.id
      limit 1
      for update of departure;
    end if;

    was_inserted := saved_departure_id is null;

    if saved_departure_id is null then
      insert into public.departures(
        service_template_id, service_date, departure_at, arrival_at, status,
        source, source_external_id, source_synced_at, source_payload_hash, source_projected
      ) values (
        selected_template_id, p_service_date, item.departure_at, item.arrival_at, 'draft',
        'dsvn', item.external_id, now(), item.payload_hash, p_projected
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
          source_projected = p_projected,
          status = case
            when admin_status_override then status
            when status = 'cancelled' then 'draft'
            else status
          end
      where id = saved_departure_id;
    end if;

    if was_inserted then
      -- Inherit capacity and price only from the same train on this route, so
      -- a newly listed local/extra train never goes on sale by itself.
      insert into public.departure_inventory(departure_id, cabin_product_id, capacity_cabins, blocked_cabins)
      select saved_departure_id, latest.cabin_product_id, latest.capacity_cabins, 0
      from (
        select distinct on (inventory.cabin_product_id)
          inventory.cabin_product_id, inventory.capacity_cabins
        from public.departure_inventory inventory
        join public.departures departure on departure.id = inventory.departure_id
        join public.service_templates template on template.id = departure.service_template_id
        where template.route_id = selected_route_id
          and template.train_id = selected_train_id
          and departure.id <> saved_departure_id
        order by inventory.cabin_product_id,
          (departure.service_date <= p_service_date) desc,
          abs(departure.service_date - p_service_date),
          departure.id desc
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
          and template.train_id = selected_train_id
          and departure.id <> saved_departure_id
        order by price.cabin_product_id,
          (departure.service_date <= p_service_date) desc,
          abs(departure.service_date - p_service_date),
          departure.id desc
      ) latest
      join public.cabin_products product on product.id = latest.cabin_product_id
      where product.code = 'standard' or item.train_number = 'SE19'
      on conflict (departure_id, cabin_product_id) do nothing;
    end if;

    select departure.admin_status_override into saved_override
    from public.departures departure
    where departure.id = saved_departure_id;

    if not saved_override then
      if not p_projected and exists (
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
    'draftWithoutFare', draft_count,
    'skipped', false
  );
end;
$$;

revoke all on function public.apply_dsvn_route_snapshot(text, date, jsonb, boolean) from public, anon, authenticated;
grant execute on function public.apply_dsvn_route_snapshot(text, date, jsonb, boolean) to service_role;

-- ---------------------------------------------------------------------------
-- 5. Batch fare upsert: replaces every listed train/segment of one date.
--    p_items: [{trainNumber, fromCode, toCode, fares: [{seat_code, seat_name, seat_group, fare_vnd}]}]
-- ---------------------------------------------------------------------------
create or replace function public.upsert_dsvn_fares_batch(
  p_service_date date,
  p_items jsonb
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  item jsonb;
  saved integer := 0;
  row_total integer;
begin
  if (select auth.role()) <> 'service_role' then raise exception 'Service role required'; end if;
  if jsonb_typeof(p_items) <> 'array' then raise exception 'Fare batch must be a JSON array'; end if;

  for item in select value from jsonb_array_elements(p_items)
  loop
    if jsonb_typeof(item -> 'fares') <> 'array' or jsonb_array_length(item -> 'fares') = 0 then
      continue;
    end if;

    delete from public.dsvn_fares
    where service_date = p_service_date
      and train_number = upper(item ->> 'trainNumber')
      and from_station_code = upper(item ->> 'fromCode')
      and to_station_code = upper(item ->> 'toCode');

    insert into public.dsvn_fares(service_date, train_number, from_station_code, to_station_code, seat_code, seat_name, seat_group, fare_vnd)
    select distinct on (fare.seat_code)
           p_service_date, upper(item ->> 'trainNumber'), upper(item ->> 'fromCode'), upper(item ->> 'toCode'),
           fare.seat_code, fare.seat_name, fare.seat_group, fare.fare_vnd
    from jsonb_to_recordset(item -> 'fares') as fare(seat_code text, seat_name text, seat_group text, fare_vnd bigint)
    where fare.fare_vnd > 0
    order by fare.seat_code;
    get diagnostics row_total = row_count;
    saved := saved + row_total;
  end loop;

  return saved;
end;
$$;

revoke all on function public.upsert_dsvn_fares_batch(date, jsonb) from public, anon, authenticated;
grant execute on function public.upsert_dsvn_fares_batch(date, jsonb) to service_role;

-- ---------------------------------------------------------------------------
-- 6. Calendar read model: projected flag
-- ---------------------------------------------------------------------------
create or replace function public.admin_schedule_calendar(
  p_route_id bigint,
  p_from date,
  p_to date
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (select private.has_admin_role(array['admin', 'operations', 'pricing', 'support'])) then
    raise exception using errcode = 'VT403', message = 'Tài khoản của bạn không có quyền xem lịch chạy.';
  end if;
  if p_from is null or p_to is null or p_to < p_from or p_to - p_from > 62 then
    raise exception using errcode = 'VT400', message = 'Khoảng ngày cần xem không hợp lệ (tối đa khoảng 2 tháng).';
  end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', departure.id,
      'version', departure.version,
      'serviceDate', departure.service_date,
      'status', departure.status,
      'source', departure.source,
      'projected', departure.source_projected,
      'adminStatusOverride', departure.admin_status_override,
      'departureAt', departure.departure_at,
      'arrivalAt', departure.arrival_at,
      'updatedAt', departure.updated_at,
      'trainId', train.id,
      'trainNumber', train.train_number,
      'departureTime', to_char(template.departure_time, 'HH24:MI'),
      'arrivalTime', to_char(template.arrival_time, 'HH24:MI'),
      'arrivalDayOffset', template.arrival_day_offset,
      'hasOrders', exists (select 1 from public.order_legs leg where leg.departure_id = departure.id),
      'dsvnFare', (
        select jsonb_build_object(
          'lowerMin', min(fare.fare_vnd) filter (where fare.seat_group = 'k4_lower'),
          'lowerMax', max(fare.fare_vnd) filter (where fare.seat_group = 'k4_lower'),
          'upperMin', min(fare.fare_vnd) filter (where fare.seat_group = 'k4_upper'),
          'upperMax', max(fare.fare_vnd) filter (where fare.seat_group = 'k4_upper'),
          'fetchedAt', max(fare.fetched_at)
        )
        from public.dsvn_fares fare
        where fare.service_date = departure.service_date
          and fare.train_number = train.train_number
          and fare.from_station_code = from_station.code
          and fare.to_station_code = to_station.code
        having count(*) > 0
      ),
      'products', coalesce((
        select jsonb_agg(jsonb_build_object(
          'code', product.code,
          'capacity', inventory.capacity_cabins,
          'blocked', inventory.blocked_cabins,
          'ticketPrice', price.ticket_price_vnd,
          'sold', coalesce(holds.sold, 0),
          'held', coalesce(holds.held, 0)
        ) order by product.code desc)
        from public.departure_inventory inventory
        join public.cabin_products product on product.id = inventory.cabin_product_id
        left join public.departure_prices price
          on price.departure_id = inventory.departure_id
         and price.cabin_product_id = inventory.cabin_product_id
        left join lateral (
          select
            sum(hold.quantity_cabins) filter (where hold.released_at is null and hold.consumed_at is not null)::integer as sold,
            sum(hold.quantity_cabins) filter (where hold.released_at is null and hold.consumed_at is null and hold.expires_at > now())::integer as held
          from public.inventory_holds hold
          where hold.departure_inventory_id = inventory.id
        ) holds on true
        where inventory.departure_id = departure.id
      ), '[]'::jsonb)
    ) order by departure.service_date, template.departure_time, train.train_number)
    from public.departures departure
    join public.service_templates template on template.id = departure.service_template_id
    join public.trains train on train.id = template.train_id
    join public.routes route on route.id = template.route_id
    join public.stations from_station on from_station.id = route.from_station_id
    join public.stations to_station on to_station.id = route.to_station_id
    where template.route_id = p_route_id
      and departure.service_date between p_from and p_to
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.admin_schedule_calendar(bigint, date, date) from public, anon;
grant execute on function public.admin_schedule_calendar(bigint, date, date) to authenticated;

commit;
