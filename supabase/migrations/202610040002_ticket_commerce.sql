begin;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  public_reference text not null unique check (public_reference ~ '^VT-[A-Z0-9]{12}$'),
  verification_token uuid not null default gen_random_uuid(),
  idempotency_key uuid not null unique,
  status text not null default 'awaiting_payment'
    check (status in ('awaiting_payment', 'confirmed', 'completed', 'expired', 'cancelled', 'payment_review', 'refund_pending', 'refunded')),
  payment_status text not null default 'not_started'
    check (payment_status in ('not_started', 'pending', 'paid', 'failed', 'expired', 'review', 'refund_pending', 'partially_refunded', 'refunded')),
  contact_email text not null check (length(contact_email) between 3 and 160),
  contact_phone text not null check (length(contact_phone) between 8 and 30),
  locale text not null default 'vi' check (locale in ('vi', 'en')),
  subtotal_vnd bigint not null check (subtotal_vnd >= 0),
  tax_vnd bigint not null default 0 check (tax_vnd >= 0),
  discount_vnd bigint not null default 0 check (discount_vnd >= 0),
  total_vnd bigint not null check (total_vnd >= 0),
  currency text not null default 'VND' check (currency = 'VND'),
  price_expires_at timestamptz not null,
  cancellation_reason text,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_total_consistent check (total_vnd = subtotal_vnd + tax_vnd - discount_vnd)
);

create table if not exists public.order_legs (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  departure_id bigint not null references public.departures(id),
  cabin_product_id bigint not null references public.cabin_products(id),
  leg_number smallint not null check (leg_number in (1, 2)),
  from_station_code text not null,
  from_station_name_vi text not null,
  from_station_name_en text not null,
  to_station_code text not null,
  to_station_name_vi text not null,
  to_station_name_en text not null,
  train_number text not null,
  departure_at timestamptz not null,
  arrival_at timestamptz not null,
  product_code text not null check (product_code in ('standard', 'premium')),
  product_name_vi text not null,
  product_name_en text not null,
  ticket_quantity smallint not null default 4 check (ticket_quantity = 4),
  ticket_price_vnd bigint not null check (ticket_price_vnd > 0),
  cabin_price_vnd bigint not null check (cabin_price_vnd = ticket_price_vnd * 4),
  created_at timestamptz not null default now(),
  constraint order_legs_order_number_unique unique (order_id, leg_number)
);

create table if not exists public.passengers (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  passenger_number smallint not null check (passenger_number between 1 and 4),
  passenger_type text not null check (passenger_type in ('adult', 'child')),
  full_name text not null check (length(full_name) between 2 and 120),
  email text not null check (length(email) between 3 and 160),
  phone text not null check (length(phone) between 8 and 30),
  date_of_birth date,
  created_at timestamptz not null default now(),
  constraint passengers_order_number_unique unique (order_id, passenger_number)
);

create table if not exists public.inventory_holds (
  id uuid primary key default gen_random_uuid(),
  hold_token uuid not null default gen_random_uuid() unique,
  order_id uuid not null references public.orders(id) on delete cascade,
  departure_inventory_id bigint not null references public.departure_inventory(id),
  quantity_cabins smallint not null default 1 check (quantity_cabins = 1),
  expires_at timestamptz not null,
  released_at timestamptz,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint inventory_holds_one_terminal check (released_at is null or consumed_at is null),
  constraint inventory_holds_order_inventory_unique unique (order_id, departure_inventory_id)
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id),
  provider text not null check (provider in ('fake', 'vnpay', 'momo')),
  merchant_request_id text not null,
  provider_transaction_id text,
  requested_amount_vnd bigint not null check (requested_amount_vnd > 0),
  reported_amount_vnd bigint check (reported_amount_vnd >= 0),
  currency text not null default 'VND' check (currency = 'VND'),
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'failed', 'expired', 'review', 'refund_pending', 'partially_refunded', 'refunded')),
  provider_result_code text,
  checkout_expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payments_provider_request_unique unique (provider, merchant_request_id),
  constraint payments_provider_transaction_unique unique (provider, provider_transaction_id)
);

create table if not exists public.payment_events (
  id bigint generated always as identity primary key,
  payment_id uuid references public.payments(id),
  provider text not null check (provider in ('fake', 'vnpay', 'momo')),
  provider_event_id text not null,
  signature_valid boolean not null,
  event_type text not null,
  result_code text,
  redacted_payload jsonb not null default '{}'::jsonb,
  processing_result text not null,
  created_at timestamptz not null default now(),
  constraint payment_events_provider_event_unique unique (provider, provider_event_id)
);

create index if not exists order_legs_order_id_idx on public.order_legs(order_id);
create index if not exists order_legs_departure_id_idx on public.order_legs(departure_id);
create index if not exists order_legs_product_id_idx on public.order_legs(cabin_product_id);
create index if not exists passengers_order_id_idx on public.passengers(order_id);
create index if not exists inventory_holds_order_id_idx on public.inventory_holds(order_id);
create index if not exists inventory_holds_inventory_expiry_active_idx
  on public.inventory_holds(departure_inventory_id, expires_at)
  where released_at is null;
create index if not exists payments_order_id_idx on public.payments(order_id);
create index if not exists payment_events_payment_id_idx on public.payment_events(payment_id);
create index if not exists orders_status_created_idx on public.orders(status, created_at desc);
create index if not exists orders_payment_status_created_idx on public.orders(payment_status, created_at desc);

drop trigger if exists orders_touch on public.orders;
create trigger orders_touch before update on public.orders
for each row execute function private.touch_versioned_row();
drop trigger if exists payments_touch on public.payments;
create trigger payments_touch before update on public.payments
for each row execute function private.touch_versioned_row();

create or replace function private.remaining_cabins(p_inventory_id bigint)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select greatest(
    inventory.capacity_cabins
      - inventory.blocked_cabins
      - coalesce(sum(hold.quantity_cabins) filter (
          where hold.released_at is null
            and (hold.consumed_at is not null or hold.expires_at > now())
        ), 0)::integer,
    0
  )
  from public.departure_inventory inventory
  left join public.inventory_holds hold on hold.departure_inventory_id = inventory.id
  where inventory.id = p_inventory_id
  group by inventory.id;
$$;

create or replace function public.search_published_departures(
  p_from_code text,
  p_to_code text,
  p_service_date date,
  p_locale text default 'vi'
)
returns table (
  departure_id bigint,
  schedule_id text,
  train_number text,
  from_station text,
  to_station text,
  departure_time text,
  arrival_time text,
  arrival_day_offset smallint,
  duration_minutes integer,
  products jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    departure.id,
    concat(train.train_number, '-', departure.id),
    train.train_number,
    case when p_locale = 'en' then from_station.name_en else from_station.name_vi end,
    case when p_locale = 'en' then to_station.name_en else to_station.name_vi end,
    to_char(template.departure_time, 'HH24:MI'),
    to_char(template.arrival_time, 'HH24:MI'),
    template.arrival_day_offset,
    greatest(1, floor(extract(epoch from (departure.arrival_at - departure.departure_at)) / 60)::integer),
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'code', product.code,
        'nameVi', product.name_vi,
        'nameEn', product.name_en,
        'ticketPrice', price.ticket_price_vnd,
        'cabinPrice', price.cabin_price_vnd,
        'remainingCabins', private.remaining_cabins(inventory.id)
      ) order by product.code)
      from public.departure_inventory inventory
      join public.cabin_products product on product.id = inventory.cabin_product_id and product.active
      join public.departure_prices price
        on price.departure_id = inventory.departure_id
       and price.cabin_product_id = inventory.cabin_product_id
      where inventory.departure_id = departure.id
        and private.remaining_cabins(inventory.id) > 0
    ), '[]'::jsonb)
  from public.departures departure
  join public.service_templates template on template.id = departure.service_template_id and template.active
  join public.routes route on route.id = template.route_id and route.active
  join public.stations from_station on from_station.id = route.from_station_id and from_station.active
  join public.stations to_station on to_station.id = route.to_station_id and to_station.active
  join public.trains train on train.id = template.train_id and train.active
  where departure.status = 'published'
    and departure.service_date = p_service_date
    and from_station.code = upper(trim(p_from_code))
    and to_station.code = upper(trim(p_to_code))
  order by template.departure_time;
$$;

create or replace function public.create_booking_hold(
  p_departure_id bigint,
  p_return_departure_id bigint,
  p_product_code text,
  p_contact_email text,
  p_contact_phone text,
  p_locale text,
  p_passengers jsonb,
  p_idempotency_key uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_order public.orders%rowtype;
  product public.cabin_products%rowtype;
  outbound record;
  inbound record;
  order_id uuid;
  public_reference text;
  verification_token uuid;
  hold_expiry timestamptz := now() + interval '15 minutes';
  subtotal bigint;
  tax bigint;
  passenger_count integer;
begin
  select * into existing_order from public.orders where idempotency_key = p_idempotency_key;
  if found then
    return jsonb_build_object(
      'reference', existing_order.public_reference,
      'verificationToken', existing_order.verification_token,
      'status', existing_order.status,
      'paymentStatus', existing_order.payment_status,
      'expiresAt', existing_order.price_expires_at,
      'pricing', jsonb_build_object('subtotal', existing_order.subtotal_vnd, 'tax', existing_order.tax_vnd, 'total', existing_order.total_vnd)
    );
  end if;

  if p_locale not in ('vi', 'en') then raise exception 'Unsupported locale'; end if;
  if p_product_code not in ('standard', 'premium') then raise exception 'Unsupported cabin product'; end if;
  if p_contact_email is null or length(trim(p_contact_email)) < 3 then raise exception 'Contact email is required'; end if;
  if p_contact_phone is null or length(trim(p_contact_phone)) < 8 then raise exception 'Contact phone is required'; end if;
  if jsonb_typeof(p_passengers) <> 'array' then raise exception 'Passengers must be an array'; end if;
  passenger_count := jsonb_array_length(p_passengers);
  if passenger_count < 1 or passenger_count > 4 then raise exception 'Passenger count must be between one and four'; end if;

  select * into product from public.cabin_products where code = p_product_code and active;
  if not found then raise exception 'Cabin product is unavailable'; end if;

  perform 1
  from public.departure_inventory inventory
  where inventory.departure_id in (p_departure_id, coalesce(p_return_departure_id, p_departure_id))
    and inventory.cabin_product_id = product.id
  order by inventory.id
  for update;

  select
    departure.id as departure_id, inventory.id as inventory_id, inventory.capacity_cabins,
    route.from_station_id, route.to_station_id,
    from_station.code as from_code, from_station.name_vi as from_vi, from_station.name_en as from_en,
    to_station.code as to_code, to_station.name_vi as to_vi, to_station.name_en as to_en,
    train.train_number, departure.departure_at, departure.arrival_at,
    price.ticket_price_vnd, price.cabin_price_vnd
  into outbound
  from public.departures departure
  join public.service_templates template on template.id = departure.service_template_id
  join public.routes route on route.id = template.route_id
  join public.stations from_station on from_station.id = route.from_station_id
  join public.stations to_station on to_station.id = route.to_station_id
  join public.trains train on train.id = template.train_id
  join public.departure_inventory inventory on inventory.departure_id = departure.id and inventory.cabin_product_id = product.id
  join public.departure_prices price on price.departure_id = departure.id and price.cabin_product_id = product.id
  where departure.id = p_departure_id and departure.status = 'published';

  if outbound.departure_id is null then raise exception 'Selected departure is not available'; end if;
  if outbound.departure_at <= now() then raise exception 'Selected departure has already departed'; end if;
  if product.code = 'premium' and outbound.train_number <> 'SE19' then raise exception 'VIP2 is available only on SE19'; end if;
  if private.remaining_cabins(outbound.inventory_id) < 1 then raise exception 'The selected cabin is sold out'; end if;

  if p_return_departure_id is not null then
    select
      departure.id as departure_id, inventory.id as inventory_id, inventory.capacity_cabins,
      route.from_station_id, route.to_station_id,
      from_station.code as from_code, from_station.name_vi as from_vi, from_station.name_en as from_en,
      to_station.code as to_code, to_station.name_vi as to_vi, to_station.name_en as to_en,
      train.train_number, departure.departure_at, departure.arrival_at,
      price.ticket_price_vnd, price.cabin_price_vnd
    into inbound
    from public.departures departure
    join public.service_templates template on template.id = departure.service_template_id
    join public.routes route on route.id = template.route_id
    join public.stations from_station on from_station.id = route.from_station_id
    join public.stations to_station on to_station.id = route.to_station_id
    join public.trains train on train.id = template.train_id
    join public.departure_inventory inventory on inventory.departure_id = departure.id and inventory.cabin_product_id = product.id
    join public.departure_prices price on price.departure_id = departure.id and price.cabin_product_id = product.id
    where departure.id = p_return_departure_id and departure.status = 'published';

    if inbound.departure_id is null then raise exception 'Selected return departure is not available'; end if;
    if inbound.departure_at <= outbound.arrival_at then raise exception 'Return departure must be after outbound arrival'; end if;
    if inbound.from_station_id <> outbound.to_station_id or inbound.to_station_id <> outbound.from_station_id then
      raise exception 'Return departure must reverse the outbound route';
    end if;
    if product.code = 'premium' and inbound.train_number <> 'SE19' then raise exception 'VIP2 is available only on SE19'; end if;
    if private.remaining_cabins(inbound.inventory_id) < 1 then raise exception 'The selected return cabin is sold out'; end if;
  end if;

  subtotal := outbound.cabin_price_vnd + case when p_return_departure_id is null then 0 else inbound.cabin_price_vnd end;
  tax := round(subtotal * 0.10);
  public_reference := 'VT-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));
  verification_token := gen_random_uuid();

  insert into public.orders(
    public_reference, verification_token, idempotency_key, contact_email, contact_phone, locale,
    subtotal_vnd, tax_vnd, total_vnd, price_expires_at
  ) values (
    public_reference, verification_token, p_idempotency_key, lower(trim(p_contact_email)), trim(p_contact_phone), p_locale,
    subtotal, tax, subtotal + tax, hold_expiry
  ) returning id into order_id;

  insert into public.order_legs(
    order_id, departure_id, cabin_product_id, leg_number,
    from_station_code, from_station_name_vi, from_station_name_en,
    to_station_code, to_station_name_vi, to_station_name_en,
    train_number, departure_at, arrival_at, product_code, product_name_vi, product_name_en,
    ticket_price_vnd, cabin_price_vnd
  ) values (
    order_id, outbound.departure_id, product.id, 1,
    outbound.from_code, outbound.from_vi, outbound.from_en,
    outbound.to_code, outbound.to_vi, outbound.to_en,
    outbound.train_number, outbound.departure_at, outbound.arrival_at, product.code, product.name_vi, product.name_en,
    outbound.ticket_price_vnd, outbound.cabin_price_vnd
  );

  insert into public.inventory_holds(order_id, departure_inventory_id, expires_at)
  values (order_id, outbound.inventory_id, hold_expiry);

  if p_return_departure_id is not null then
    insert into public.order_legs(
      order_id, departure_id, cabin_product_id, leg_number,
      from_station_code, from_station_name_vi, from_station_name_en,
      to_station_code, to_station_name_vi, to_station_name_en,
      train_number, departure_at, arrival_at, product_code, product_name_vi, product_name_en,
      ticket_price_vnd, cabin_price_vnd
    ) values (
      order_id, inbound.departure_id, product.id, 2,
      inbound.from_code, inbound.from_vi, inbound.from_en,
      inbound.to_code, inbound.to_vi, inbound.to_en,
      inbound.train_number, inbound.departure_at, inbound.arrival_at, product.code, product.name_vi, product.name_en,
      inbound.ticket_price_vnd, inbound.cabin_price_vnd
    );
    insert into public.inventory_holds(order_id, departure_inventory_id, expires_at)
    values (order_id, inbound.inventory_id, hold_expiry);
  end if;

  insert into public.passengers(order_id, passenger_number, passenger_type, full_name, email, phone, date_of_birth)
  select
    order_id,
    row_number() over ()::smallint,
    case when passenger ->> 'type' = 'child' then 'child' else 'adult' end,
    trim(passenger ->> 'fullName'),
    lower(trim(passenger ->> 'email')),
    trim(passenger ->> 'phone'),
    nullif(passenger ->> 'dateOfBirth', '')::date
  from jsonb_array_elements(p_passengers) passenger;

  return jsonb_build_object(
    'reference', public_reference,
    'verificationToken', verification_token,
    'status', 'awaiting_payment',
    'paymentStatus', 'not_started',
    'expiresAt', hold_expiry,
    'pricing', jsonb_build_object('subtotal', subtotal, 'tax', tax, 'total', subtotal + tax)
  );
end;
$$;

create or replace function public.get_order_receipt(p_reference text, p_verification_token uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'reference', orders.public_reference,
    'status', orders.status,
    'paymentStatus', orders.payment_status,
    'expiresAt', orders.price_expires_at,
    'pricing', jsonb_build_object('subtotal', orders.subtotal_vnd, 'tax', orders.tax_vnd, 'total', orders.total_vnd),
    'legs', coalesce((select jsonb_agg(jsonb_build_object(
      'legNumber', leg.leg_number,
      'fromStation', case when orders.locale = 'en' then leg.from_station_name_en else leg.from_station_name_vi end,
      'toStation', case when orders.locale = 'en' then leg.to_station_name_en else leg.to_station_name_vi end,
      'trainNumber', leg.train_number,
      'departureAt', leg.departure_at,
      'arrivalAt', leg.arrival_at,
      'productName', case when orders.locale = 'en' then leg.product_name_en else leg.product_name_vi end,
      'ticketPrice', leg.ticket_price_vnd,
      'cabinPrice', leg.cabin_price_vnd
    ) order by leg.leg_number) from public.order_legs leg where leg.order_id = orders.id), '[]'::jsonb)
  )
  from public.orders
  where orders.public_reference = upper(trim(p_reference))
    and orders.verification_token = p_verification_token;
$$;

create or replace function public.expire_booking_holds(p_batch_size integer default 100)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected integer;
begin
  with expired_orders as (
    select distinct orders.id
    from public.orders orders
    join public.inventory_holds hold on hold.order_id = orders.id
    where orders.status = 'awaiting_payment'
      and hold.released_at is null
      and hold.consumed_at is null
      and hold.expires_at <= now()
    order by orders.id
    limit greatest(1, least(p_batch_size, 1000))
    for update of orders skip locked
  ), released as (
    update public.inventory_holds hold
    set released_at = now()
    where hold.order_id in (select id from expired_orders)
      and hold.released_at is null and hold.consumed_at is null
    returning hold.order_id
  )
  update public.orders orders
  set status = 'expired', payment_status = case when payment_status = 'not_started' then 'expired' else payment_status end
  where orders.id in (select id from expired_orders);
  get diagnostics affected = row_count;
  return affected;
end;
$$;

alter table public.orders enable row level security;
alter table public.order_legs enable row level security;
alter table public.passengers enable row level security;
alter table public.inventory_holds enable row level security;
alter table public.payments enable row level security;
alter table public.payment_events enable row level security;

create policy orders_admin_read on public.orders for select to authenticated
using ((select private.has_admin_role(array['admin', 'operations', 'pricing', 'support'])));
create policy order_legs_admin_read on public.order_legs for select to authenticated
using ((select private.has_admin_role(array['admin', 'operations', 'pricing', 'support'])));
create policy passengers_admin_read on public.passengers for select to authenticated
using ((select private.has_admin_role(array['admin', 'operations', 'support'])));
create policy inventory_holds_admin_read on public.inventory_holds for select to authenticated
using ((select private.has_admin_role(array['admin', 'operations', 'support'])));
create policy payments_admin_read on public.payments for select to authenticated
using ((select private.has_admin_role(array['admin', 'operations', 'pricing', 'support'])));
create policy payment_events_admin_read on public.payment_events for select to authenticated
using ((select private.has_admin_role(array['admin', 'operations', 'pricing'])));

revoke all on public.orders, public.order_legs, public.passengers, public.inventory_holds,
  public.payments, public.payment_events from public, anon, authenticated;
grant select on public.orders, public.order_legs, public.passengers, public.inventory_holds,
  public.payments, public.payment_events to authenticated;
grant usage, select on sequence public.order_legs_id_seq, public.passengers_id_seq,
  public.payment_events_id_seq to authenticated;

revoke all on function public.search_published_departures(text, text, date, text) from public;
grant execute on function public.search_published_departures(text, text, date, text) to anon, authenticated;
revoke all on function public.create_booking_hold(bigint, bigint, text, text, text, text, jsonb, uuid) from public;
grant execute on function public.create_booking_hold(bigint, bigint, text, text, text, text, jsonb, uuid) to anon, authenticated;
revoke all on function public.get_order_receipt(text, uuid) from public;
grant execute on function public.get_order_receipt(text, uuid) to anon, authenticated;
revoke all on function public.expire_booking_holds(integer) from public, anon, authenticated;

commit;
