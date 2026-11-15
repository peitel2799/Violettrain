begin;

alter table public.orders
  add constraint orders_contact_email_format
  check (contact_email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$') not valid;
alter table public.orders validate constraint orders_contact_email_format;

alter table public.passengers
  add constraint passengers_email_format
  check (email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$') not valid;
alter table public.passengers validate constraint passengers_email_format;

create unique index if not exists payments_one_pending_per_order_idx
  on public.payments(order_id)
  where status = 'pending';

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

  select * into selected_payment
  from public.payments
  where order_id = selected_order.id
    and status = 'pending'
    and checkout_expires_at > now()
  order by created_at desc
  limit 1;

  if found then
    if selected_payment.provider <> p_provider then
      raise exception 'An active checkout already exists with another provider';
    end if;

    return jsonb_build_object(
      'paymentId', selected_payment.id,
      'merchantRequestId', selected_payment.merchant_request_id,
      'amount', selected_payment.requested_amount_vnd,
      'currency', selected_payment.currency,
      'expiresAt', selected_payment.checkout_expires_at,
      'reused', true
    );
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
    'reused', false
  );
end;
$$;

revoke all on function public.create_payment_attempt(text, text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.create_payment_attempt(text, text, text, timestamptz) to service_role;

commit;
