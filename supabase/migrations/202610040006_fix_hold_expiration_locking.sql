begin;

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
    select orders.id
    from public.orders orders
    where orders.status = 'awaiting_payment'
      and exists (
        select 1
        from public.inventory_holds hold
        where hold.order_id = orders.id
          and hold.released_at is null
          and hold.consumed_at is null
          and hold.expires_at <= now()
      )
    order by orders.id
    limit greatest(1, least(p_batch_size, 1000))
    for update of orders skip locked
  ), released as (
    update public.inventory_holds hold
    set released_at = now()
    where hold.order_id in (select id from expired_orders)
      and hold.released_at is null
      and hold.consumed_at is null
    returning hold.order_id
  )
  update public.orders orders
  set status = 'expired',
      payment_status = case
        when payment_status in ('not_started', 'pending') then 'expired'
        else payment_status
      end
  where orders.id in (select id from expired_orders);

  get diagnostics affected = row_count;
  return affected;
end;
$$;

revoke all on function public.expire_booking_holds(integer) from public, anon, authenticated;
grant execute on function public.expire_booking_holds(integer) to service_role;

commit;
