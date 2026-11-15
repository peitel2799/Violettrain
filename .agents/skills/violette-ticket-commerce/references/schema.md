# Supabase schema contract

Use this as the logical contract, not as a reason to create one oversized migration. Keep migrations small, ordered, reversible where practical, and safe for existing data.

## Catalog and timetable

| Table | Purpose | Required constraints |
|---|---|---|
| `stations` | Station catalog | unique `code`; localized names; `active` |
| `routes` | Bookable station pair | unique `(from_station_id, to_station_id)`; from != to |
| `trains` | Train number and product capability | unique `train_number`; `vip2_enabled` true only for SE19 unless product rules change |
| `service_templates` | Recurring train/route/times | unique business key; timezone-aware source metadata and verification date |
| `departures` | One dated run | unique `(service_template_id, service_date)`; status `draft/published/cancelled/departed` |
| `cabin_products` | `standard` and `premium` catalog | unique stable code; `tickets_per_cabin = 4` |

Store local operating date separately from UTC timestamps. Use `date` for `service_date`, `time` for timetable wall time when appropriate, and `timestamptz` for generated departure/arrival instants and audit fields.

## Inventory and price

`departure_inventory` owns sellable capacity for one product on one dated departure:

- `departure_id` and `cabin_product_id` foreign keys.
- `capacity_cabins`, `blocked_cabins`, and optional `sold_cabins` are non-negative integers.
- Unique `(departure_id, cabin_product_id)`.
- VIP2 row is allowed only for SE19 and has capacity at most one.
- Standard capacity is configured by operations, never inferred from a marketing room count.

`departure_prices` stores:

- `ticket_price_vnd bigint check (ticket_price_vnd >= 0)`.
- `cabin_price_vnd bigint generated always as (ticket_price_vnd * 4) stored`, or an equivalent enforced check if generated columns are unsuitable.
- Optional `effective_from`, `effective_to`, `currency = 'VND'`, and reason.
- Unique active price for one departure/product/channel.

Orders copy both amounts. Historical orders must not change when an admin edits future prices.

## Holds and orders

`inventory_holds`:

- high-entropy public-safe token plus internal primary key;
- departure inventory FK, order FK, quantity (currently one cabin), `expires_at`, `released_at`, `consumed_at`;
- check that only one terminal marker is set;
- partial index on `(departure_inventory_id, expires_at)` for active holds.

`orders`:

- internal identity key plus unique non-sequential `public_reference`;
- unique idempotency key scoped to the requesting client/session;
- state, payment state, contact email/phone, locale, totals in integer VND;
- `price_expires_at`, `created_at`, `updated_at`, optional cancellation reason;
- no card, bank-account, OTP, CVV, or wallet credential storage.

`order_legs` snapshots each outbound/return journey: station names/codes, train number, departure/arrival, product names, ticket fare, quantity four, cabin total, tax/fee/discount components.

`passengers` belongs to an order and stores only data required for fulfillment. Define a retention/deletion policy before production.

## Payment and audit tables

Create `payments` and `payment_events` before enabling a gateway, but keep provider payloads redacted:

- unique `(provider, provider_transaction_id)` when provider ID exists;
- unique `(provider, provider_event_id)` or a deterministic event hash for idempotency;
- requested amount, reported amount, normalized status, provider result code, signature-valid flag, timestamps;
- raw payload only if secrets/PII are removed and retention is explicit.

`admin_profiles` links `auth.users.id` to `admin`, `operations`, `pricing`, or `support` roles. `audit_logs` append actor, action, entity, before/after JSON, request correlation ID, and timestamp; clients never update or delete audit rows.

## Atomic functions

Prefer narrow SQL functions with explicit `search_path` and revoked default execute privileges:

- `create_booking_hold(...)`: validate published departure/product, lock inventory, clear expired demand from the calculation, verify capacity, snapshot price, create order and hold, return minimal checkout data.
- `consume_hold_after_payment(...)`: lock order/hold, ignore duplicate events, mark payment paid, consume hold, confirm order.
- `expire_holds(batch_size)`: mark expired active holds released in bounded batches.

All functions verify caller or remain service-role-only. Do not expose a general SQL execution surface.

## Required indexes

- Every foreign key.
- `departures(service_date, status, service_template_id)` for public search.
- `departure_inventory(departure_id, cabin_product_id)` unique.
- Active hold partial index by inventory and expiry.
- `orders(status, created_at desc)` and `orders(payment_status, created_at desc)` for admin queues.
- Lowercased contact search indexes only if operations genuinely needs them; never make PII public.
- Columns used by RLS policies, especially `admin_profiles(user_id, role)`.

## RLS outline

- Public catalog projections: select active/published rows only.
- Orders/passengers/holds/payments/events: no `anon` collection access.
- Customer lookup: server-mediated with order reference plus verification factor, or authenticated ownership if customer accounts are added.
- Admin tables: authenticated user must have an allowed role, using an indexed membership check.
- Service role: server jobs, gateway callbacks, and migrations only.
