begin;

-- ---------------------------------------------------------------------------
-- Manual PayPal payment (no online checkout yet).
--
-- Flow: guest books -> cabin is held for MANUAL_PAYMENT_HOLD_HOURS -> an email
-- from the company tells them how much to send by PayPal -> staff confirm the
-- money in /admin/orders -> order becomes confirmed/paid and a confirmation
-- email is sent. Guests also leave a WhatsApp number for follow-up.
-- ---------------------------------------------------------------------------

alter table public.orders
  add column if not exists contact_whatsapp text,
  add column if not exists payment_channel text not null default 'online',
  add column if not exists booking_email_sent_at timestamptz,
  add column if not exists payment_email_sent_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'orders_payment_channel_valid' and conrelid = 'public.orders'::regclass) then
    alter table public.orders add constraint orders_payment_channel_valid
      check (payment_channel in ('online', 'manual_paypal'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'orders_contact_whatsapp_format' and conrelid = 'public.orders'::regclass) then
    -- E.164: "+" then country code and number, 8 to 15 digits in total.
    alter table public.orders add constraint orders_contact_whatsapp_format
      check (contact_whatsapp is null or contact_whatsapp ~ '^\+[1-9][0-9]{7,14}$');
  end if;
end;
$$;

create index if not exists orders_manual_awaiting_idx
  on public.orders(price_expires_at)
  where payment_channel = 'manual_paypal' and status = 'awaiting_payment';

alter table public.payments drop constraint if exists payments_provider_check;
alter table public.payments add constraint payments_provider_check
  check (provider in ('fake', 'vnpay', 'momo', 'paypal', 'manual'));
alter table public.payment_events drop constraint if exists payment_events_provider_check;
alter table public.payment_events add constraint payment_events_provider_check
  check (provider in ('fake', 'vnpay', 'momo', 'paypal', 'manual'));

-- Called by the server right after create_booking_hold. Switches a fresh order
-- to manual PayPal, stores the WhatsApp number and lengthens the cabin hold so
-- the guest has time to transfer. Idempotent for replays of the same order.
create or replace function public.prepare_manual_payment_order(
  p_reference text,
  p_whatsapp text,
  p_hold_minutes integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_order public.orders%rowtype;
  hold_minutes integer := least(greatest(coalesce(p_hold_minutes, 1440), 15), 2880);
  new_expiry timestamptz;
begin
  if (select auth.role()) <> 'service_role' then raise exception 'Service role required'; end if;
  if p_whatsapp is null or p_whatsapp !~ '^\+[1-9][0-9]{7,14}$' then
    raise exception 'Invalid WhatsApp number';
  end if;

  select * into selected_order
  from public.orders
  where public_reference = upper(trim(p_reference))
  for update;
  if not found then raise exception 'Order not found'; end if;

  if selected_order.payment_channel = 'manual_paypal' then
    return jsonb_build_object('reference', selected_order.public_reference, 'expiresAt', selected_order.price_expires_at, 'replayed', true);
  end if;
  if selected_order.status <> 'awaiting_payment' or selected_order.payment_status <> 'not_started' then
    raise exception 'Order cannot switch to manual payment';
  end if;

  -- Anchor on creation time so retries never keep pushing the deadline out.
  new_expiry := selected_order.created_at + make_interval(mins => hold_minutes);

  update public.orders
  set payment_channel = 'manual_paypal',
      contact_whatsapp = p_whatsapp,
      price_expires_at = new_expiry
  where id = selected_order.id;

  update public.inventory_holds
  set expires_at = new_expiry
  where order_id = selected_order.id
    and released_at is null
    and consumed_at is null;

  return jsonb_build_object('reference', selected_order.public_reference, 'expiresAt', new_expiry, 'replayed', false);
end;
$$;

revoke all on function public.prepare_manual_payment_order(text, text, integer) from public, anon, authenticated;
grant execute on function public.prepare_manual_payment_order(text, text, integer) to service_role;

-- Staff confirm that the PayPal transfer arrived. Works while the hold is
-- active, and also after it lapsed as long as the cabin is still free.
create or replace function public.admin_confirm_manual_payment(
  p_reference text,
  p_paypal_reference text,
  p_note text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_order public.orders%rowtype;
  hold record;
  label text;
begin
  if not (select private.has_admin_role(array['admin', 'operations'])) then
    raise exception using errcode = 'VT403', message = 'Chỉ Quản trị viên hoặc Vận hành mới được xác nhận tiền.';
  end if;

  select * into selected_order
  from public.orders
  where public_reference = upper(trim(p_reference))
  for update;
  if not found then
    raise exception using errcode = 'VT400', message = 'Không tìm thấy đơn hàng.';
  end if;
  if selected_order.status = 'confirmed' and selected_order.payment_status = 'paid' then
    raise exception using errcode = 'VT409', message = 'Đơn này đã được xác nhận thanh toán rồi.';
  end if;
  if selected_order.status not in ('awaiting_payment', 'expired') then
    raise exception using errcode = 'VT400', message = format('Đơn đang ở trạng thái "%s" nên không xác nhận được.', selected_order.status);
  end if;

  -- Lock the inventory rows in a stable order (same as create_booking_hold).
  perform 1
  from public.departure_inventory inventory
  where inventory.id in (select departure_inventory_id from public.inventory_holds where order_id = selected_order.id)
  order by inventory.id
  for update;

  for hold in
    select h.id, h.departure_inventory_id, h.expires_at, h.released_at, h.consumed_at,
           to_char(leg.departure_at at time zone 'Asia/Ho_Chi_Minh', 'DD/MM/YYYY') || ' tàu ' || leg.train_number as leg_label
    from public.inventory_holds h
    join public.departure_inventory inventory on inventory.id = h.departure_inventory_id
    join public.order_legs leg on leg.order_id = h.order_id and leg.departure_id = inventory.departure_id
    where h.order_id = selected_order.id
    order by h.departure_inventory_id
  loop
    label := hold.leg_label;
    if hold.consumed_at is not null then
      continue;
    end if;
    -- A lapsed or released hold no longer reserves the cabin: re-check it is still free.
    if (hold.released_at is not null or hold.expires_at <= now())
       and private.remaining_cabins(hold.departure_inventory_id) < 1 then
      raise exception using errcode = 'VT400',
        message = format('Cabin chuyến %s đã được bán cho khách khác sau khi hết hạn giữ chỗ. Hãy liên hệ khách để đổi chuyến hoặc hoàn tiền.', label);
    end if;
    update public.inventory_holds
    set released_at = null,
        consumed_at = now(),
        expires_at = greatest(expires_at, now())
    where id = hold.id;
  end loop;

  insert into public.payments(
    order_id, provider, merchant_request_id, provider_transaction_id,
    requested_amount_vnd, reported_amount_vnd, status, provider_result_code, checkout_expires_at
  ) values (
    selected_order.id, 'manual',
    'MANUAL-' || replace(selected_order.public_reference, '-', '') || '-' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISSMS'),
    nullif(trim(coalesce(p_paypal_reference, '')), ''),
    selected_order.total_vnd, selected_order.total_vnd, 'paid', 'MANUAL_CONFIRMED', now()
  );

  update public.orders
  set status = 'confirmed', payment_status = 'paid', confirmed_at = now()
  where id = selected_order.id;

  insert into public.audit_logs(actor_id, action, entity_table, entity_id, before_data, after_data)
  values (
    (select auth.uid()), 'manual_payment_confirmed', 'orders', selected_order.id::text,
    jsonb_build_object('status', selected_order.status, 'payment_status', selected_order.payment_status),
    jsonb_build_object('status', 'confirmed', 'payment_status', 'paid',
      'paypal_reference', nullif(trim(coalesce(p_paypal_reference, '')), ''),
      'note', nullif(trim(coalesce(p_note, '')), ''))
  );

  return jsonb_build_object('reference', selected_order.public_reference, 'status', 'confirmed');
end;
$$;

revoke all on function public.admin_confirm_manual_payment(text, text, text) from public, anon;
grant execute on function public.admin_confirm_manual_payment(text, text, text) to authenticated;

-- Staff cancel an unpaid order (guest changed plans / never paid) and free the cabin.
create or replace function public.admin_cancel_unpaid_order(p_reference text, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_order public.orders%rowtype;
begin
  if not (select private.has_admin_role(array['admin', 'operations'])) then
    raise exception using errcode = 'VT403', message = 'Chỉ Quản trị viên hoặc Vận hành mới được hủy đơn.';
  end if;

  select * into selected_order
  from public.orders
  where public_reference = upper(trim(p_reference))
  for update;
  if not found then
    raise exception using errcode = 'VT400', message = 'Không tìm thấy đơn hàng.';
  end if;
  if selected_order.payment_status = 'paid' or selected_order.status not in ('awaiting_payment', 'expired') then
    raise exception using errcode = 'VT400', message = 'Chỉ hủy được đơn chưa thanh toán. Đơn đã thanh toán cần xử lý hoàn tiền.';
  end if;

  update public.inventory_holds
  set released_at = now()
  where order_id = selected_order.id and released_at is null and consumed_at is null;

  update public.orders
  set status = 'cancelled',
      payment_status = case when payment_status in ('not_started', 'pending') then 'expired' else payment_status end,
      cancellation_reason = coalesce(nullif(trim(coalesce(p_reason, '')), ''), 'Nhân viên hủy đơn chưa thanh toán')
  where id = selected_order.id;

  insert into public.audit_logs(actor_id, action, entity_table, entity_id, before_data, after_data)
  values (
    (select auth.uid()), 'unpaid_order_cancelled', 'orders', selected_order.id::text,
    jsonb_build_object('status', selected_order.status),
    jsonb_build_object('status', 'cancelled', 'reason', nullif(trim(coalesce(p_reason, '')), ''))
  );

  return jsonb_build_object('reference', selected_order.public_reference, 'status', 'cancelled');
end;
$$;

revoke all on function public.admin_cancel_unpaid_order(text, text) from public, anon;
grant execute on function public.admin_cancel_unpaid_order(text, text) to authenticated;

commit;
