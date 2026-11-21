-- DSVN sync never locks a sale on its own; only staff pause departures.
--
-- Before: every sync set departures without a Violette price to 'draft' (shown
-- as "Tạm ngưng bán") and cancelled any departure DSVN stopped listing.
-- Now:
--   * a departure goes on sale ('published') once it has a price and cabins,
--     unless a staff member set its status (admin_status_override);
--   * the sync never moves a departure to 'draft' or 'cancelled' by itself;
--   * a train DSVN no longer lists is reported back ('missing') for the
--     admin log, and stays as staff left it;
--   * only projected placeholders (DSVN not open yet) that DSVN does not run
--     are withdrawn, since no one put them on sale.

begin;

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
  missing_trains jsonb := '[]'::jsonb;
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

    -- The sync never pauses a sale: only staff do (admin_status_override).
    -- It opens a real (DSVN-listed) departure once it has a price and cabins;
    -- a departure without price simply stays unsold until staff set one.
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
        update public.departures set status = 'published' where id = saved_departure_id and status <> 'published';
      else
        draft_count := draft_count + 1;
      end if;
    end if;

    upserted_count := upserted_count + 1;
  end loop;

  select coalesce(jsonb_agg(distinct train.train_number), '[]'::jsonb) into missing_trains
  from public.departures departure
  join public.service_templates template on template.id = departure.service_template_id
  join public.trains train on train.id = template.train_id
  where template.route_id = selected_route_id
    and departure.service_date = p_service_date
    and departure.source = 'dsvn'
    and not departure.source_projected
    and departure.status in ('draft', 'published')
    and not exists (
      select 1
      from jsonb_array_elements(p_departures) snapshot
      where snapshot ->> 'external_id' = departure.source_external_id
    );

  update public.departures departure
  set status = 'cancelled', source_synced_at = now()
  from public.service_templates template
  where departure.service_template_id = template.id
    and template.route_id = selected_route_id
    and departure.service_date = p_service_date
    and departure.source = 'dsvn'
    and departure.status in ('draft', 'published')
    and departure.source_projected
    and not departure.admin_status_override
    and not exists (
      select 1
      from jsonb_array_elements(p_departures) snapshot
      where snapshot ->> 'external_id' = departure.source_external_id
    );
  get diagnostics cancelled_count = row_count;

  return jsonb_build_object(
    'upserted', upserted_count,
    'cancelled', cancelled_count,
    'missing', missing_trains,
    'draftWithoutFare', draft_count,
    'skipped', false
  );
end;
$$;

revoke all on function public.apply_dsvn_route_snapshot(text, date, jsonb, boolean) from public, anon, authenticated;
grant execute on function public.apply_dsvn_route_snapshot(text, date, jsonb, boolean) to service_role;

commit;
