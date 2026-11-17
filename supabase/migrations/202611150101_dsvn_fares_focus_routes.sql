begin;

-- ---------------------------------------------------------------------------
-- 1. Focus network: Ha Noi <-> the seven tourist destinations Violette serves.
--    Codes follow DSVN station codes (HNO, HUE, NBI, DHO, DNA verified in the
--    DSVN fare API; LCA, NTR, SGO to be confirmed when fares are fetched).
-- ---------------------------------------------------------------------------
insert into public.stations(code, name_vi, name_en)
values
  ('HNO', 'Hà Nội', 'Hanoi'),
  ('LCA', 'Lào Cai', 'Lao Cai'),
  ('NBI', 'Ninh Bình', 'Ninh Binh'),
  ('DHO', 'Đồng Hới', 'Dong Hoi'),
  ('HUE', 'Huế', 'Hue'),
  ('DNA', 'Đà Nẵng', 'Da Nang'),
  ('NTR', 'Nha Trang', 'Nha Trang'),
  ('SGO', 'Sài Gòn', 'Saigon')
on conflict (code) do nothing;

insert into public.routes(code, from_station_id, to_station_id)
select pair.from_code || '-' || pair.to_code, from_station.id, to_station.id
from (
  values
    ('HNO', 'LCA'), ('LCA', 'HNO'),
    ('HNO', 'NBI'), ('NBI', 'HNO'),
    ('HNO', 'DHO'), ('DHO', 'HNO'),
    ('HNO', 'HUE'), ('HUE', 'HNO'),
    ('HNO', 'DNA'), ('DNA', 'HNO'),
    ('HNO', 'NTR'), ('NTR', 'HNO'),
    ('HNO', 'SGO'), ('SGO', 'HNO')
) as pair(from_code, to_code)
join public.stations from_station on from_station.code = pair.from_code
join public.stations to_station on to_station.code = pair.to_code
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 2. DSVN reference fares ("giá cơ sở"): what DSVN sells each seat for on a
--    given date/train/segment. Read-only reference for staff; never used to
--    price Violette orders.
-- ---------------------------------------------------------------------------
create table if not exists public.dsvn_fares (
  id bigint generated always as identity primary key,
  service_date date not null,
  train_number text not null,
  from_station_code text not null,
  to_station_code text not null,
  seat_code text not null,
  seat_name text not null,
  seat_group text not null check (seat_group in ('k4_lower', 'k4_upper', 'k6', 'k2', 'k2_vip', 'seat', 'other')),
  fare_vnd bigint not null check (fare_vnd > 0),
  fetched_at timestamptz not null default now(),
  constraint dsvn_fares_unique unique (service_date, train_number, from_station_code, to_station_code, seat_code)
);

create index if not exists dsvn_fares_lookup_idx
  on public.dsvn_fares(service_date, train_number, from_station_code, to_station_code);

alter table public.dsvn_fares enable row level security;
drop policy if exists dsvn_fares_admin_read on public.dsvn_fares;
create policy dsvn_fares_admin_read on public.dsvn_fares for select to authenticated
using ((select private.has_admin_role(array['admin', 'operations', 'pricing', 'support'])));
revoke all on public.dsvn_fares from public, anon, authenticated;
grant select on public.dsvn_fares to authenticated;

-- Replaces the fare list of one date/train/segment atomically (service role only).
create or replace function public.upsert_dsvn_fares(
  p_service_date date,
  p_train_number text,
  p_from_code text,
  p_to_code text,
  p_fares jsonb
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved integer;
begin
  if (select auth.role()) <> 'service_role' then raise exception 'Service role required'; end if;
  if jsonb_typeof(p_fares) <> 'array' or jsonb_array_length(p_fares) = 0 then
    raise exception 'Fare list for % % %-% is empty', p_service_date, p_train_number, p_from_code, p_to_code;
  end if;

  delete from public.dsvn_fares
  where service_date = p_service_date
    and train_number = upper(p_train_number)
    and from_station_code = upper(p_from_code)
    and to_station_code = upper(p_to_code);

  insert into public.dsvn_fares(service_date, train_number, from_station_code, to_station_code, seat_code, seat_name, seat_group, fare_vnd)
  select p_service_date, upper(p_train_number), upper(p_from_code), upper(p_to_code),
         fare.seat_code, fare.seat_name, fare.seat_group, fare.fare_vnd
  from jsonb_to_recordset(p_fares) as fare(seat_code text, seat_name text, seat_group text, fare_vnd bigint);
  get diagnostics saved = row_count;
  return saved;
end;
$$;

revoke all on function public.upsert_dsvn_fares(date, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.upsert_dsvn_fares(date, text, text, text, jsonb) to service_role;

-- Full fare list for one departure (day panel detail).
create or replace function public.admin_departure_dsvn_fares(p_departure_id bigint)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when not (select private.has_admin_role(array['admin', 'operations', 'pricing', 'support'])) then null
    else coalesce((
      select jsonb_agg(jsonb_build_object(
        'seatCode', fare.seat_code,
        'seatName', fare.seat_name,
        'seatGroup', fare.seat_group,
        'fare', fare.fare_vnd,
        'fetchedAt', fare.fetched_at
      ) order by fare.seat_group, fare.fare_vnd)
      from public.departures departure
      join public.service_templates template on template.id = departure.service_template_id
      join public.trains train on train.id = template.train_id
      join public.routes route on route.id = template.route_id
      join public.stations from_station on from_station.id = route.from_station_id
      join public.stations to_station on to_station.id = route.to_station_id
      join public.dsvn_fares fare
        on fare.service_date = departure.service_date
       and fare.train_number = train.train_number
       and fare.from_station_code = from_station.code
       and fare.to_station_code = to_station.code
      where departure.id = p_departure_id
    ), '[]'::jsonb)
  end;
$$;

revoke all on function public.admin_departure_dsvn_fares(bigint) from public, anon;
grant execute on function public.admin_departure_dsvn_fares(bigint) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. DSVN sync with guards against empty / sharply shrunken snapshots.
-- ---------------------------------------------------------------------------
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
          status = case
            when admin_status_override then status
            when status = 'cancelled' then 'draft'
            else status
          end
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
        order by inventory.cabin_product_id,
          (template.train_id = selected_train_id) desc,
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
          and departure.id <> saved_departure_id
        order by price.cabin_product_id,
          (template.train_id = selected_train_id) desc,
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

-- ---------------------------------------------------------------------------
-- 4. Calendar read model now carries the DSVN 4-berth reference fares.
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
