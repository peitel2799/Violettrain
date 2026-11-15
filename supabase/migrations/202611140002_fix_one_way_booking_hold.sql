begin;

-- Fix: one-way bookings failed with "record inbound is not assigned yet".
-- Identical to 202610040002 except for the subtotal calculation.
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

  -- PL/pgSQL resolves every record field in an expression, even in an untaken
  -- CASE branch, so referencing the unassigned inbound record broke one-way orders.
  subtotal := outbound.cabin_price_vnd;
  if p_return_departure_id is not null then
    subtotal := subtotal + inbound.cabin_price_vnd;
  end if;
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

revoke all on function public.create_booking_hold(bigint, bigint, text, text, text, text, jsonb, uuid) from public;
grant execute on function public.create_booking_hold(bigint, bigint, text, text, text, text, jsonb, uuid) to anon, authenticated;

commit;
