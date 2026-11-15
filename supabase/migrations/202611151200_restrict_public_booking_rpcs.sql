begin;

-- ---------------------------------------------------------------------------
-- Security hardening: public booking RPCs are server-only.
--
-- create_booking_hold and get_order_receipt used to be executable with the
-- public anon key, so anyone could call them straight on the Supabase REST API
-- and skip the website's validation and rate limits (cabin hoarding, booking
-- spam, guessing order tokens). The Next.js routes now call them with the
-- service-role key, so the anon and authenticated roles lose EXECUTE.
-- ---------------------------------------------------------------------------

revoke all on function public.create_booking_hold(bigint, bigint, text, text, text, text, jsonb, uuid)
  from public, anon, authenticated;
grant execute on function public.create_booking_hold(bigint, bigint, text, text, text, text, jsonb, uuid)
  to service_role;

revoke all on function public.get_order_receipt(text, uuid)
  from public, anon, authenticated;
grant execute on function public.get_order_receipt(text, uuid)
  to service_role;

commit;
