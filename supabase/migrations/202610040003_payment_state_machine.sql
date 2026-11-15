begin;

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
  if p_provider not in ('fake', 'vnpay', 'momo') then raise exception 'Unsupported payment provider'; end if;

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

  insert into public.payments(
    order_id, provider, merchant_request_id, requested_amount_vnd, checkout_expires_at
  ) values (
    selected_order.id, p_provider, p_merchant_request_id, selected_order.total_vnd,
    least(p_checkout_expires_at, selected_order.price_expires_at)
  )
  on conflict (provider, merchant_request_id) do update
  set updated_at = now()
  returning * into selected_payment;

  update public.orders
  set payment_status = 'pending'
  where id = selected_order.id and payment_status in ('not_started', 'failed');

  return jsonb_build_object(
    'paymentId', selected_payment.id,
    'merchantRequestId', selected_payment.merchant_request_id,
    'amount', selected_payment.requested_amount_vnd,
    'currency', selected_payment.currency,
    'expiresAt', selected_payment.checkout_expires_at
  );
end;
$$;

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
    processing_result := 'already_confirmed';
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

revoke all on function public.create_payment_attempt(text, text, text, timestamptz) from public, anon, authenticated;
revoke all on function public.apply_verified_payment_event(text, text, text, text, bigint, text, boolean, jsonb) from public, anon, authenticated;
grant execute on function public.create_payment_attempt(text, text, text, timestamptz) to service_role;
grant execute on function public.apply_verified_payment_event(text, text, text, text, bigint, text, boolean, jsonb) to service_role;
grant execute on function public.expire_booking_holds(integer) to service_role;

commit;
