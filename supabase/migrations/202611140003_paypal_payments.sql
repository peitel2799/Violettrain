begin;

-- ---------------------------------------------------------------------------
-- PayPal as a second payment provider (international guests).
-- PayPal does not settle VND for standard merchants, so each PayPal attempt
-- stores the foreign amount it charged (minor units) and the VND rate used.
-- Customers may now switch provider while the cabin hold is active; a second
-- completed payment for an already-paid order is flagged for refund review.
-- ---------------------------------------------------------------------------

alter table public.payments drop constraint if exists payments_provider_check;
alter table public.payments add constraint payments_provider_check
  check (provider in ('fake', 'vnpay', 'momo', 'paypal'));
alter table public.payment_events drop constraint if exists payment_events_provider_check;
alter table public.payment_events add constraint payment_events_provider_check
  check (provider in ('fake', 'vnpay', 'momo', 'paypal'));

alter table public.payments
  add column if not exists provider_checkout_id text,
  add column if not exists provider_currency text,
  add column if not exists provider_amount_minor bigint,
  add column if not exists fx_vnd_per_unit numeric(14, 4);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'payments_provider_amount_valid' and conrelid = 'public.payments'::regclass) then
    alter table public.payments add constraint payments_provider_amount_valid check (
      (provider_currency is null and provider_amount_minor is null and fx_vnd_per_unit is null)
      or (provider_currency ~ '^[A-Z]{3}$' and provider_amount_minor > 0 and fx_vnd_per_unit > 0)
    );
  end if;
end;
$$;

create unique index if not exists payments_provider_checkout_unique
  on public.payments(provider, provider_checkout_id)
  where provider_checkout_id is not null;

create or replace function public.create_payment_attempt(
  p_order_reference text,
  p_provider text,
  p_merchant_request_id text,
  p_checkout_expires_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_order public.orders%rowtype;
  selected_payment public.payments%rowtype;
begin
  if (select auth.role()) <> 'service_role' then raise exception 'Service role required'; end if;
  if p_provider not in ('fake', 'vnpay', 'momo', 'paypal') then raise exception 'Unsupported payment provider'; end if;

  select * into selected_order
  from public.orders
  where public_reference = upper(trim(p_order_reference))
  for update;

  if not found then raise exception 'Order not found'; end if;
  if selected_order.status <> 'awaiting_payment' then raise exception 'Order is not awaiting payment'; end if;
  if selected_order.price_expires_at <= now() then
    perform public.expire_booking_holds(100);
    raise exception 'Order hold has expired';
  end if;

  select * into selected_payment
  from public.payments
  where order_id = selected_order.id
    and status = 'pending'
    and checkout_expires_at > now()
  order by created_at desc
  limit 1;

  if found then
    if selected_payment.provider = p_provider then
      return jsonb_build_object(
        'paymentId', selected_payment.id,
        'merchantRequestId', selected_payment.merchant_request_id,
        'amount', selected_payment.requested_amount_vnd,
        'currency', selected_payment.currency,
        'expiresAt', selected_payment.checkout_expires_at,
        'providerCheckoutId', selected_payment.provider_checkout_id,
        'providerCurrency', selected_payment.provider_currency,
        'providerAmountMinor', selected_payment.provider_amount_minor,
        'reused', true
      );
    end if;

    -- The customer switched method (e.g. VNPay -> PayPal). Retire the unfinished
    -- checkout; if it still completes later, apply_verified_payment_event confirms
    -- the order once and flags any second payment for refund review.
    update public.payments set status = 'expired' where id = selected_payment.id;
  end if;

  update public.payments
  set status = 'expired'
  where order_id = selected_order.id
    and status = 'pending'
    and checkout_expires_at <= now();

  insert into public.payments(
    order_id, provider, merchant_request_id, requested_amount_vnd, checkout_expires_at
  ) values (
    selected_order.id, p_provider, p_merchant_request_id, selected_order.total_vnd,
    least(p_checkout_expires_at, selected_order.price_expires_at)
  )
  returning * into selected_payment;

  update public.orders
  set payment_status = 'pending'
  where id = selected_order.id and payment_status in ('not_started', 'failed');

  return jsonb_build_object(
    'paymentId', selected_payment.id,
    'merchantRequestId', selected_payment.merchant_request_id,
    'amount', selected_payment.requested_amount_vnd,
    'currency', selected_payment.currency,
    'expiresAt', selected_payment.checkout_expires_at,
    'providerCheckoutId', null,
    'providerCurrency', null,
    'providerAmountMinor', null,
    'reused', false
  );
end;
$$;

revoke all on function public.create_payment_attempt(text, text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.create_payment_attempt(text, text, text, timestamptz) to service_role;

-- Records the provider-side checkout (PayPal order id) and the exact foreign
-- amount requested, so the capture can be compared against it later.
create or replace function public.attach_payment_checkout(
  p_provider text,
  p_merchant_request_id text,
  p_checkout_id text,
  p_currency text,
  p_amount_minor bigint,
  p_fx_vnd_per_unit numeric
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected integer;
begin
  if (select auth.role()) <> 'service_role' then raise exception 'Service role required'; end if;

  update public.payments
  set provider_checkout_id = p_checkout_id,
      provider_currency = upper(p_currency),
      provider_amount_minor = p_amount_minor,
      fx_vnd_per_unit = p_fx_vnd_per_unit
  where provider = p_provider
    and merchant_request_id = p_merchant_request_id
    and (provider_checkout_id is null or provider_checkout_id = p_checkout_id)
    and (provider_amount_minor is null or provider_amount_minor = p_amount_minor);
  get diagnostics affected = row_count;
  if affected = 0 then raise exception 'Payment checkout cannot be attached'; end if;
end;
$$;

revoke all on function public.attach_payment_checkout(text, text, text, text, bigint, numeric) from public, anon, authenticated;
grant execute on function public.attach_payment_checkout(text, text, text, text, bigint, numeric) to service_role;

create or replace function public.apply_verified_payment_event(
  p_provider text,
  p_merchant_request_id text,
  p_provider_event_id text,
  p_provider_transaction_id text,
  p_reported_amount_vnd bigint,
  p_result_code text,
  p_success boolean,
  p_redacted_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_payment public.payments%rowtype;
  selected_order public.orders%rowtype;
  active_hold_count integer;
  total_hold_count integer;
  processing_result text;
begin
  if (select auth.role()) <> 'service_role' then raise exception 'Service role required'; end if;

  if exists (
    select 1 from public.payment_events
    where provider = p_provider and provider_event_id = p_provider_event_id
  ) then
    return jsonb_build_object('duplicate', true, 'result', 'already_processed');
  end if;

  select * into selected_payment
  from public.payments
  where provider = p_provider and merchant_request_id = p_merchant_request_id
  for update;
  if not found then raise exception 'Payment not found'; end if;

  select * into selected_order from public.orders where id = selected_payment.order_id for update;

  if p_reported_amount_vnd <> selected_payment.requested_amount_vnd then
    update public.payments set status = 'review', reported_amount_vnd = p_reported_amount_vnd,
      provider_transaction_id = nullif(p_provider_transaction_id, ''), provider_result_code = p_result_code
    where id = selected_payment.id;
    update public.orders set status = 'payment_review', payment_status = 'review' where id = selected_order.id;
    processing_result := 'amount_mismatch_review';
  elsif not p_success then
    update public.payments set status = 'failed', reported_amount_vnd = p_reported_amount_vnd,
      provider_transaction_id = nullif(p_provider_transaction_id, ''), provider_result_code = p_result_code
    where id = selected_payment.id;
    update public.orders set payment_status = 'failed' where id = selected_order.id and status = 'awaiting_payment';
    processing_result := 'payment_failed';
  elsif selected_order.status = 'confirmed' and selected_order.payment_status = 'paid' then
    if selected_payment.status = 'paid' then
      processing_result := 'already_confirmed';
    else
      -- A second, different payment for an order that is already paid
      -- (e.g. VNPay and PayPal both completed). Keep the order confirmed and
      -- flag this payment so staff refund it.
      update public.payments set status = 'review', reported_amount_vnd = p_reported_amount_vnd,
        provider_transaction_id = nullif(p_provider_transaction_id, ''), provider_result_code = p_result_code
      where id = selected_payment.id;
      processing_result := 'duplicate_payment_review';
    end if;
  else
    select count(*), count(*) filter (
      where released_at is null and consumed_at is null and expires_at > now()
    ) into total_hold_count, active_hold_count
    from public.inventory_holds where order_id = selected_order.id;

    if total_hold_count = 0 or active_hold_count <> total_hold_count then
      update public.payments set status = 'review', reported_amount_vnd = p_reported_amount_vnd,
        provider_transaction_id = nullif(p_provider_transaction_id, ''), provider_result_code = p_result_code
      where id = selected_payment.id;
      update public.orders set status = 'payment_review', payment_status = 'review' where id = selected_order.id;
      processing_result := 'late_success_review';
    else
      update public.inventory_holds set consumed_at = now()
      where order_id = selected_order.id and released_at is null and consumed_at is null;
      update public.payments set status = 'paid', reported_amount_vnd = p_reported_amount_vnd,
        provider_transaction_id = nullif(p_provider_transaction_id, ''), provider_result_code = p_result_code
      where id = selected_payment.id;
      update public.orders set status = 'confirmed', payment_status = 'paid', confirmed_at = now()
      where id = selected_order.id;
      processing_result := 'confirmed';
    end if;
  end if;

  insert into public.payment_events(
    payment_id, provider, provider_event_id, signature_valid, event_type,
    result_code, redacted_payload, processing_result
  ) values (
    selected_payment.id, p_provider, p_provider_event_id, true, 'payment_result',
    p_result_code, coalesce(p_redacted_payload, '{}'::jsonb), processing_result
  );

  return jsonb_build_object(
    'duplicate', false,
    'result', processing_result,
    'reference', selected_order.public_reference
  );
end;
$$;

revoke all on function public.apply_verified_payment_event(text, text, text, text, bigint, text, boolean, jsonb) from public, anon, authenticated;
grant execute on function public.apply_verified_payment_event(text, text, text, text, bigint, text, boolean, jsonb) to service_role;

commit;
