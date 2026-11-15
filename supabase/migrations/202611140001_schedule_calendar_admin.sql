begin;

-- ---------------------------------------------------------------------------
-- Lịch & Giá: calendar-first schedule and per-day fare management for staff.
--
-- 1. Remember when a staff member chose a departure status so the 04:00 DSVN
--    sync never re-opens a day that staff paused or cancelled.
-- 2. Calendar read model with sold/held cabins per departure.
-- 3. Bulk update (price / capacity / open-pause-cancel) for selected days.
-- 4. Bulk create for a date range + weekdays, with a dry-run preview.
-- 5. Safe delete for departures created by mistake (no orders only).
-- 6. Public fare calendar and "from" price summary from published data.
--
-- Errors raised for staff use SQLSTATE VT400 (validation), VT403 (permission)
-- and VT409 (stale data) with Vietnamese messages that the admin UI shows as-is.
-- ---------------------------------------------------------------------------

alter table public.departures
  add column if not exists admin_status_override boolean not null default false;

comment on column public.departures.admin_status_override is
  'True once a staff member set the status; automated DSVN sync keeps that status.';

create or replace function private.mark_admin_status_override()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- auth.uid() is null for the service role (cron sync) and set for staff sessions.
  if (select auth.uid()) is not null then
    if tg_op = 'INSERT' or new.status is distinct from old.status then
      new.admin_status_override := true;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists departures_mark_admin_status on public.departures;
create trigger departures_mark_admin_status before insert or update on public.departures
for each row execute function private.mark_admin_status_override();

-- Committed cabins = paid (consumed) + still-valid holds. Used to block unsafe edits.
create or replace function private.committed_cabins(p_departure_id bigint, p_product_code text)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(hold.quantity_cabins), 0)::integer
  from public.departure_inventory inventory
  join public.cabin_products product on product.id = inventory.cabin_product_id
  join public.inventory_holds hold on hold.departure_inventory_id = inventory.id
  where inventory.departure_id = p_departure_id
    and product.code = p_product_code
    and hold.released_at is null
    and (hold.consumed_at is not null or hold.expires_at > now());
$$;

revoke all on function private.committed_cabins(bigint, text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- DSVN sync: keep staff decisions, adopt manually created departures of the
-- same train/date, and inherit the nearest earlier fare instead of the
-- furthest-future one (which could be a holiday price).
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
-- Calendar read model for one route and a date window (max ~2 months).
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
    where template.route_id = p_route_id
      and departure.service_date between p_from and p_to
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.admin_schedule_calendar(bigint, date, date) from public, anon;
grant execute on function public.admin_schedule_calendar(bigint, date, date) to authenticated;

-- ---------------------------------------------------------------------------
-- Bulk update selected departures. NULL parameters mean "keep as is".
-- p_items: [{"id": 12, "version": 3}, ...]
-- ---------------------------------------------------------------------------
create or replace function public.admin_bulk_update_departures(
  p_items jsonb,
  p_status text,
  p_standard_ticket_price_vnd bigint,
  p_standard_capacity integer,
  p_vip2_ticket_price_vnd bigint,
  p_vip2_capacity integer,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  can_operate boolean := (select private.has_admin_role(array['admin', 'operations']));
  can_price boolean := (select private.has_admin_role(array['admin', 'operations', 'pricing']));
  change_reason text := coalesce(nullif(trim(p_reason), ''), 'Cập nhật từ trang Lịch & Giá');
  standard_product_id bigint;
  premium_product_id bigint;
  item record;
  selected record;
  label text;
  standard_committed integer;
  premium_committed integer;
  updated_count integer := 0;
  skipped_vip2 integer := 0;
begin
  if not can_price then
    raise exception using errcode = 'VT403', message = 'Tài khoản của bạn không có quyền thay đổi lịch chạy hoặc giá.';
  end if;
  if not can_operate and (p_status is not null or p_standard_capacity is not null or p_vip2_capacity is not null) then
    raise exception using errcode = 'VT403', message = 'Tài khoản Giá vé chỉ được đổi giá; mở/tạm ngưng bán và số cabin do bộ phận Vận hành phụ trách.';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception using errcode = 'VT400', message = 'Bạn chưa chọn chuyến nào.';
  end if;
  if jsonb_array_length(p_items) > 500 then
    raise exception using errcode = 'VT400', message = 'Mỗi lần chỉ sửa được tối đa 500 chuyến. Hãy chọn ít ngày hơn.';
  end if;
  if p_status is null and p_standard_ticket_price_vnd is null and p_standard_capacity is null
     and p_vip2_ticket_price_vnd is null and p_vip2_capacity is null then
    raise exception using errcode = 'VT400', message = 'Chưa có thay đổi nào để lưu.';
  end if;
  if p_status is not null and p_status not in ('draft', 'published', 'cancelled') then
    raise exception using errcode = 'VT400', message = 'Trạng thái bán không hợp lệ.';
  end if;
  if p_standard_ticket_price_vnd is not null and (p_standard_ticket_price_vnd < 10000 or p_standard_ticket_price_vnd > 100000000) then
    raise exception using errcode = 'VT400', message = 'Giá 1 vé phải từ 10.000đ đến 100.000.000đ.';
  end if;
  if p_vip2_ticket_price_vnd is not null and (p_vip2_ticket_price_vnd < 10000 or p_vip2_ticket_price_vnd > 100000000) then
    raise exception using errcode = 'VT400', message = 'Giá 1 vé VIP2 phải từ 10.000đ đến 100.000.000đ.';
  end if;
  if p_standard_capacity is not null and (p_standard_capacity < 0 or p_standard_capacity > 100) then
    raise exception using errcode = 'VT400', message = 'Số cabin phải từ 0 đến 100.';
  end if;
  if p_vip2_capacity is not null and p_vip2_capacity not in (0, 1) then
    raise exception using errcode = 'VT400', message = 'Tàu SE19 chỉ có tối đa 1 cabin VIP2.';
  end if;

  select id into standard_product_id from public.cabin_products where code = 'standard';
  select id into premium_product_id from public.cabin_products where code = 'premium';

  for item in
    select distinct (entry ->> 'id')::bigint as id, nullif(entry ->> 'version', '')::bigint as version
    from jsonb_array_elements(p_items) entry
    order by 1
  loop
    select departure.id, departure.version, departure.status, departure.departure_at,
           departure.service_date, train.train_number
      into selected
    from public.departures departure
    join public.service_templates template on template.id = departure.service_template_id
    join public.trains train on train.id = template.train_id
    where departure.id = item.id
    for update of departure;

    if not found then
      raise exception using errcode = 'VT409', message = 'Một chuyến đã chọn không còn tồn tại. Trang sẽ tải lại dữ liệu mới.';
    end if;

    label := to_char(selected.service_date, 'DD/MM/YYYY') || ' (tàu ' || selected.train_number || ')';

    if item.version is not null and item.version <> selected.version then
      raise exception using errcode = 'VT409',
        message = format('Chuyến ngày %s vừa được người khác thay đổi. Trang sẽ tải lại, bạn hãy thực hiện lại.', label);
    end if;
    if selected.departure_at <= now() then
      raise exception using errcode = 'VT400',
        message = format('Chuyến ngày %s đã khởi hành nên không sửa được nữa. Hãy bỏ chọn chuyến này.', label);
    end if;

    standard_committed := private.committed_cabins(selected.id, 'standard');
    premium_committed := private.committed_cabins(selected.id, 'premium');

    if p_status = 'cancelled' and selected.status <> 'cancelled' and standard_committed + premium_committed > 0 then
      raise exception using errcode = 'VT400',
        message = format('Chuyến ngày %s đã có khách đặt hoặc đang thanh toán, không thể hủy. Hãy chọn "Tạm ngưng bán" và liên hệ khách trước.', label);
    end if;

    if p_standard_capacity is not null then
      if p_standard_capacity < standard_committed then
        raise exception using errcode = 'VT400',
          message = format('Chuyến ngày %s đã bán/giữ %s cabin, không thể giảm xuống %s cabin.', label, standard_committed, p_standard_capacity);
      end if;
      insert into public.departure_inventory as current_inventory (departure_id, cabin_product_id, capacity_cabins)
      values (selected.id, standard_product_id, p_standard_capacity)
      on conflict (departure_id, cabin_product_id) do update
      set capacity_cabins = excluded.capacity_cabins,
          blocked_cabins = least(current_inventory.blocked_cabins, excluded.capacity_cabins);
    end if;

    if p_standard_ticket_price_vnd is not null then
      insert into public.departure_prices(departure_id, cabin_product_id, ticket_price_vnd, reason)
      values (selected.id, standard_product_id, p_standard_ticket_price_vnd, change_reason)
      on conflict (departure_id, cabin_product_id) do update
      set ticket_price_vnd = excluded.ticket_price_vnd, reason = excluded.reason;
    end if;

    if p_vip2_ticket_price_vnd is not null or p_vip2_capacity is not null then
      if selected.train_number <> 'SE19' then
        skipped_vip2 := skipped_vip2 + 1;
      else
        if p_vip2_ticket_price_vnd is not null then
          insert into public.departure_prices(departure_id, cabin_product_id, ticket_price_vnd, reason)
          values (selected.id, premium_product_id, p_vip2_ticket_price_vnd, change_reason)
          on conflict (departure_id, cabin_product_id) do update
          set ticket_price_vnd = excluded.ticket_price_vnd, reason = excluded.reason;
        end if;
        if p_vip2_capacity is not null then
          if p_vip2_capacity < premium_committed then
            raise exception using errcode = 'VT400',
              message = format('Cabin VIP2 chuyến ngày %s đã có khách, không thể tắt.', label);
          end if;
          if p_vip2_capacity > 0 and not exists (
            select 1 from public.departure_prices price
            where price.departure_id = selected.id and price.cabin_product_id = premium_product_id
          ) then
            raise exception using errcode = 'VT400',
              message = format('Chuyến ngày %s chưa có giá VIP2. Hãy nhập giá VIP2 cùng lúc.', label);
          end if;
          insert into public.departure_inventory as current_inventory (departure_id, cabin_product_id, capacity_cabins)
          values (selected.id, premium_product_id, p_vip2_capacity)
          on conflict (departure_id, cabin_product_id) do update
          set capacity_cabins = excluded.capacity_cabins,
              blocked_cabins = least(current_inventory.blocked_cabins, excluded.capacity_cabins);
        end if;
      end if;
    end if;

    if p_status = 'published' and not exists (
      select 1
      from public.departure_inventory inventory
      join public.departure_prices price
        on price.departure_id = inventory.departure_id
       and price.cabin_product_id = inventory.cabin_product_id
      where inventory.departure_id = selected.id
        and inventory.cabin_product_id = standard_product_id
        and inventory.capacity_cabins > 0
    ) then
      raise exception using errcode = 'VT400',
        message = format('Chuyến ngày %s chưa có giá vé hoặc số cabin bằng 0. Hãy đặt giá và số cabin trước khi mở bán.', label);
    end if;

    -- Always touch the departure so its version changes with any price/capacity edit.
    update public.departures
    set status = coalesce(p_status, status),
        updated_at = now()
    where id = selected.id;

    updated_count := updated_count + 1;
  end loop;

  return jsonb_build_object('updated', updated_count, 'skippedVip2', skipped_vip2);
end;
$$;

revoke all on function public.admin_bulk_update_departures(jsonb, text, bigint, integer, bigint, integer, text) from public, anon;
grant execute on function public.admin_bulk_update_departures(jsonb, text, bigint, integer, bigint, integer, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Bulk create (or refresh) departures of one train on many dates.
-- With p_dry_run = true nothing is written; the counts power the preview.
-- ---------------------------------------------------------------------------
create or replace function public.admin_bulk_create_departures(
  p_route_id bigint,
  p_train_id bigint,
  p_dates date[],
  p_departure_time time,
  p_arrival_time time,
  p_arrival_day_offset smallint,
  p_publish boolean,
  p_standard_capacity integer,
  p_standard_ticket_price_vnd bigint,
  p_vip2_capacity integer,
  p_vip2_ticket_price_vnd bigint,
  p_update_existing boolean,
  p_reason text,
  p_dry_run boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  change_reason text := coalesce(nullif(trim(p_reason), ''), 'Tạo lịch hàng loạt từ trang Lịch & Giá');
  target_status text := case when p_publish then 'published' else 'draft' end;
  selected_train_number text;
  template_id bigint;
  standard_product_id bigint;
  premium_product_id bigint;
  service_day date;
  existing record;
  saved_departure_id bigint;
  departs_at timestamptz;
  arrives_at timestamptz;
  standard_committed integer;
  premium_committed integer;
  label text;
  created_count integer := 0;
  updated_count integer := 0;
  skipped_existing integer := 0;
  skipped_past integer := 0;
  skipped_departed integer := 0;
begin
  if not (select private.has_admin_role(array['admin', 'operations'])) then
    raise exception using errcode = 'VT403', message = 'Chỉ Quản trị viên hoặc Vận hành mới được tạo lịch chạy.';
  end if;
  if p_dates is null or cardinality(p_dates) = 0 then
    raise exception using errcode = 'VT400', message = 'Chưa có ngày chạy nào được chọn.';
  end if;
  if cardinality(p_dates) > 400 then
    raise exception using errcode = 'VT400', message = 'Mỗi lần chỉ tạo được tối đa 400 ngày.';
  end if;
  if p_arrival_day_offset is null or p_arrival_day_offset not between 0 and 3 then
    raise exception using errcode = 'VT400', message = 'Ngày đến không hợp lệ.';
  end if;
  if p_arrival_day_offset = 0 and p_arrival_time <= p_departure_time then
    raise exception using errcode = 'VT400', message = 'Giờ đến phải sau giờ đi. Nếu tàu đến vào ngày hôm sau, hãy chọn "Đến vào ngày hôm sau".';
  end if;
  if p_standard_capacity is null or p_standard_capacity < 0 or p_standard_capacity > 100 then
    raise exception using errcode = 'VT400', message = 'Số cabin phải từ 0 đến 100.';
  end if;
  if p_publish and p_standard_capacity = 0 then
    raise exception using errcode = 'VT400', message = 'Muốn mở bán thì số cabin phải lớn hơn 0.';
  end if;
  if p_standard_ticket_price_vnd is null or p_standard_ticket_price_vnd < 10000 or p_standard_ticket_price_vnd > 100000000 then
    raise exception using errcode = 'VT400', message = 'Giá 1 vé phải từ 10.000đ đến 100.000.000đ.';
  end if;
  if coalesce(p_vip2_capacity, 0) not in (0, 1) then
    raise exception using errcode = 'VT400', message = 'Tàu SE19 chỉ có tối đa 1 cabin VIP2.';
  end if;

  if not exists (select 1 from public.routes where id = p_route_id and active) then
    raise exception using errcode = 'VT400', message = 'Không tìm thấy tuyến đã chọn.';
  end if;
  select train_number into selected_train_number from public.trains where id = p_train_id and active;
  if selected_train_number is null then
    raise exception using errcode = 'VT400', message = 'Không tìm thấy tàu đã chọn.';
  end if;
  if coalesce(p_vip2_capacity, 0) > 0 and selected_train_number <> 'SE19' then
    raise exception using errcode = 'VT400', message = 'Cabin VIP2 chỉ có trên tàu SE19.';
  end if;
  if coalesce(p_vip2_capacity, 0) > 0 and (p_vip2_ticket_price_vnd is null or p_vip2_ticket_price_vnd < 10000 or p_vip2_ticket_price_vnd > 100000000) then
    raise exception using errcode = 'VT400', message = 'Hãy nhập giá 1 vé VIP2 (từ 10.000đ).';
  end if;

  select id into standard_product_id from public.cabin_products where code = 'standard';
  select id into premium_product_id from public.cabin_products where code = 'premium';

  if p_dry_run then
    select id into template_id
    from public.service_templates
    where route_id = p_route_id and train_id = p_train_id
      and departure_time = p_departure_time and arrival_time = p_arrival_time
      and arrival_day_offset = p_arrival_day_offset;
  else
    insert into public.service_templates(route_id, train_id, departure_time, arrival_time, arrival_day_offset)
    values (p_route_id, p_train_id, p_departure_time, p_arrival_time, p_arrival_day_offset)
    on conflict (route_id, train_id, departure_time, arrival_time, arrival_day_offset)
    do update set active = true, updated_at = now()
    returning id into template_id;
  end if;

  for service_day in select distinct day from unnest(p_dates) as day where day is not null order by 1
  loop
    label := to_char(service_day, 'DD/MM/YYYY');
    if service_day < today then
      skipped_past := skipped_past + 1;
      continue;
    end if;

    departs_at := (service_day + p_departure_time) at time zone 'Asia/Ho_Chi_Minh';
    arrives_at := (service_day + p_arrival_day_offset + p_arrival_time) at time zone 'Asia/Ho_Chi_Minh';
    if departs_at <= now() then
      skipped_departed := skipped_departed + 1;
      continue;
    end if;

    select departure.id, departure.status, departure.source, departure.service_template_id
      into existing
    from public.departures departure
    join public.service_templates template on template.id = departure.service_template_id
    where template.route_id = p_route_id
      and template.train_id = p_train_id
      and departure.service_date = service_day
    order by (departure.service_template_id = template_id) desc nulls last, departure.id
    limit 1
    for update of departure;

    if found then
      if not p_update_existing then
        skipped_existing := skipped_existing + 1;
        continue;
      end if;

      standard_committed := private.committed_cabins(existing.id, 'standard');
      premium_committed := private.committed_cabins(existing.id, 'premium');
      if p_standard_capacity < standard_committed then
        raise exception using errcode = 'VT400',
          message = format('Ngày %s đã bán/giữ %s cabin, không thể đặt số cabin là %s.', label, standard_committed, p_standard_capacity);
      end if;
      if coalesce(p_vip2_capacity, 0) < premium_committed then
        raise exception using errcode = 'VT400',
          message = format('Cabin VIP2 ngày %s đã có khách, không thể tắt.', label);
      end if;

      updated_count := updated_count + 1;
      if p_dry_run then continue; end if;

      if existing.source = 'manual' then
        update public.departures
        set service_template_id = template_id,
            departure_at = departs_at,
            arrival_at = arrives_at,
            status = target_status,
            updated_at = now()
        where id = existing.id;
      else
        -- DSVN owns the timetable of synced departures; only sales settings change.
        update public.departures
        set status = target_status, updated_at = now()
        where id = existing.id;
      end if;
      saved_departure_id := existing.id;
    else
      created_count := created_count + 1;
      if p_dry_run then continue; end if;

      insert into public.departures(service_template_id, service_date, departure_at, arrival_at, status, source)
      values (template_id, service_day, departs_at, arrives_at, target_status, 'manual')
      returning id into saved_departure_id;
    end if;

    insert into public.departure_inventory as current_inventory (departure_id, cabin_product_id, capacity_cabins)
    values (saved_departure_id, standard_product_id, p_standard_capacity)
    on conflict (departure_id, cabin_product_id) do update
    set capacity_cabins = excluded.capacity_cabins,
        blocked_cabins = least(current_inventory.blocked_cabins, excluded.capacity_cabins);

    insert into public.departure_prices(departure_id, cabin_product_id, ticket_price_vnd, reason)
    values (saved_departure_id, standard_product_id, p_standard_ticket_price_vnd, change_reason)
    on conflict (departure_id, cabin_product_id) do update
    set ticket_price_vnd = excluded.ticket_price_vnd, reason = excluded.reason;

    if selected_train_number = 'SE19' then
      if coalesce(p_vip2_capacity, 0) > 0 then
        insert into public.departure_prices(departure_id, cabin_product_id, ticket_price_vnd, reason)
        values (saved_departure_id, premium_product_id, p_vip2_ticket_price_vnd, change_reason)
        on conflict (departure_id, cabin_product_id) do update
        set ticket_price_vnd = excluded.ticket_price_vnd, reason = excluded.reason;
        insert into public.departure_inventory as current_inventory (departure_id, cabin_product_id, capacity_cabins)
        values (saved_departure_id, premium_product_id, p_vip2_capacity)
        on conflict (departure_id, cabin_product_id) do update
        set capacity_cabins = excluded.capacity_cabins,
            blocked_cabins = least(current_inventory.blocked_cabins, excluded.capacity_cabins);
      else
        update public.departure_inventory
        set capacity_cabins = 0, blocked_cabins = 0
        where departure_id = saved_departure_id and cabin_product_id = premium_product_id;
      end if;
    end if;
  end loop;

  return jsonb_build_object(
    'dryRun', p_dry_run,
    'created', created_count,
    'updated', updated_count,
    'skippedExisting', skipped_existing,
    'skippedPast', skipped_past + skipped_departed
  );
end;
$$;

revoke all on function public.admin_bulk_create_departures(bigint, bigint, date[], time, time, smallint, boolean, integer, bigint, integer, bigint, boolean, text, boolean) from public, anon;
grant execute on function public.admin_bulk_create_departures(bigint, bigint, date[], time, time, smallint, boolean, integer, bigint, integer, bigint, boolean, text, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- Delete departures created by mistake. Only manual rows without any order.
-- ---------------------------------------------------------------------------
create or replace function public.admin_delete_departures(p_items jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  item record;
  selected record;
  label text;
  deleted_count integer := 0;
begin
  if not (select private.has_admin_role(array['admin', 'operations'])) then
    raise exception using errcode = 'VT403', message = 'Chỉ Quản trị viên hoặc Vận hành mới được xóa chuyến.';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception using errcode = 'VT400', message = 'Bạn chưa chọn chuyến nào.';
  end if;
  if jsonb_array_length(p_items) > 500 then
    raise exception using errcode = 'VT400', message = 'Mỗi lần chỉ xóa được tối đa 500 chuyến.';
  end if;

  for item in
    select distinct (entry ->> 'id')::bigint as id, nullif(entry ->> 'version', '')::bigint as version
    from jsonb_array_elements(p_items) entry
    order by 1
  loop
    select departure.id, departure.version, departure.source, departure.service_date, train.train_number
      into selected
    from public.departures departure
    join public.service_templates template on template.id = departure.service_template_id
    join public.trains train on train.id = template.train_id
    where departure.id = item.id
    for update of departure;

    if not found then continue; end if;
    label := to_char(selected.service_date, 'DD/MM/YYYY') || ' (tàu ' || selected.train_number || ')';

    if item.version is not null and item.version <> selected.version then
      raise exception using errcode = 'VT409',
        message = format('Chuyến ngày %s vừa được người khác thay đổi. Trang sẽ tải lại, bạn hãy thực hiện lại.', label);
    end if;
    if selected.source <> 'manual' then
      raise exception using errcode = 'VT400',
        message = format('Chuyến ngày %s lấy từ lịch DSVN nên không xóa được (hệ thống sẽ tự thêm lại). Hãy dùng "Tạm ngưng bán".', label);
    end if;
    if exists (select 1 from public.order_legs leg where leg.departure_id = selected.id) then
      raise exception using errcode = 'VT400',
        message = format('Chuyến ngày %s đã có đơn hàng nên không xóa được. Hãy dùng "Tạm ngưng bán".', label);
    end if;

    delete from public.departures where id = selected.id;
    deleted_count := deleted_count + 1;
  end loop;

  return jsonb_build_object('deleted', deleted_count);
end;
$$;

revoke all on function public.admin_delete_departures(jsonb) from public, anon;
grant execute on function public.admin_delete_departures(jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- Public: cheapest bookable fare per day for a route (date picker price hints)
-- and "from" prices for marketing sections. Published + future + in stock only.
-- ---------------------------------------------------------------------------
create or replace function public.search_fare_calendar(
  p_from_code text,
  p_to_code text,
  p_start date,
  p_end date
)
returns table (
  service_date date,
  min_ticket_price_vnd bigint,
  min_cabin_price_vnd bigint,
  departures integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    departure.service_date,
    min(price.ticket_price_vnd),
    min(price.cabin_price_vnd),
    count(distinct departure.id)::integer
  from public.departures departure
  join public.service_templates template on template.id = departure.service_template_id and template.active
  join public.routes route on route.id = template.route_id and route.active
  join public.stations from_station on from_station.id = route.from_station_id and from_station.active
  join public.stations to_station on to_station.id = route.to_station_id and to_station.active
  join public.trains train on train.id = template.train_id and train.active
  join public.departure_inventory inventory on inventory.departure_id = departure.id
  join public.cabin_products product on product.id = inventory.cabin_product_id and product.active
  join public.departure_prices price
    on price.departure_id = inventory.departure_id
   and price.cabin_product_id = inventory.cabin_product_id
  where departure.status = 'published'
    and departure.departure_at > now()
    and from_station.code = upper(trim(p_from_code))
    and to_station.code = upper(trim(p_to_code))
    and departure.service_date between p_start and least(p_end, p_start + 62)
    and private.remaining_cabins(inventory.id) > 0
  group by departure.service_date
  order by departure.service_date;
$$;

revoke all on function public.search_fare_calendar(text, text, date, date) from public;
grant execute on function public.search_fare_calendar(text, text, date, date) to anon, authenticated;

create or replace function public.public_fare_overview(p_days integer default 90)
returns table (
  product_code text,
  from_station_code text,
  to_station_code text,
  min_ticket_price_vnd bigint,
  max_ticket_price_vnd bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    product.code,
    from_station.code,
    to_station.code,
    min(price.ticket_price_vnd),
    max(price.ticket_price_vnd)
  from public.departures departure
  join public.service_templates template on template.id = departure.service_template_id and template.active
  join public.routes route on route.id = template.route_id and route.active
  join public.stations from_station on from_station.id = route.from_station_id and from_station.active
  join public.stations to_station on to_station.id = route.to_station_id and to_station.active
  join public.trains train on train.id = template.train_id and train.active
  join public.departure_inventory inventory on inventory.departure_id = departure.id and inventory.capacity_cabins > 0
  join public.cabin_products product on product.id = inventory.cabin_product_id and product.active
  join public.departure_prices price
    on price.departure_id = inventory.departure_id
   and price.cabin_product_id = inventory.cabin_product_id
  where departure.status = 'published'
    and departure.departure_at > now()
    and departure.service_date <= (now() at time zone 'Asia/Ho_Chi_Minh')::date + least(greatest(coalesce(p_days, 90), 1), 365)
  group by product.code, from_station.code, to_station.code;
$$;

revoke all on function public.public_fare_overview(integer) from public;
grant execute on function public.public_fare_overview(integer) to anon, authenticated;

commit;
