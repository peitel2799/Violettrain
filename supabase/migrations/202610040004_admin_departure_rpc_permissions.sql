begin;

-- The RPC performs a narrowly scoped premium-row cleanup after checking the
-- caller's admin role. SECURITY DEFINER lets it complete that transaction
-- without granting authenticated users broad DELETE rights on inventory.
alter function public.admin_upsert_departure(
  bigint, bigint, bigint, bigint, date, time, time, smallint,
  text, integer, bigint, integer, bigint, text
) security definer;

commit;
