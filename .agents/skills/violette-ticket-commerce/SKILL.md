---
name: violette-ticket-commerce
description: Design or implement Violette Train's Supabase-backed schedules, daily departures, cabin inventory, pricing, holds, bookings, passengers, and order lifecycle. Use for database migrations, booking APIs, availability, preventing overselling, or replacing JSON persistence; do not use for payment-provider signatures or purely visual landing-page work.
---

# Violette Ticket Commerce

Build the booking core as a server-authoritative commerce system. Supabase Postgres is the operational source of truth; `data/train-database.json` remains a versioned timetable reference and seed input, never proof of live availability.

## Product invariants

- `standard` is sold only as one private full cabin containing four tickets. Its two upper berths are fixed.
- `premium` / VIP2 is sold only as one private four-ticket cabin on train SE19. Violette has exactly one VIP2 cabin there and its two upper berths fold up.
- The displayed one-ticket fare remains the route fare, while the amount charged for one cabin is exactly `ticket fare * 4` before explicit taxes, fees, or discounts.
- Passenger count is 1–4 and records occupants; it never reduces the cabin charge.
- A round trip consumes one cabin on each selected departure and must not leave a half-created order.
- Availability and final price are recalculated on the server at hold/order creation. Never trust client price, route labels, train details, totals, statuses, or availability.

## Data and transaction model

Read [references/schema.md](references/schema.md) before creating or changing the schema. Read [references/order-state-machine.md](references/order-state-machine.md) before changing holds, order statuses, expiry, cancellation, or confirmation.

Keep these layers separate:

1. Timetable templates describe recurring service and station times.
2. Departures represent a dated train run in `Asia/Ho_Chi_Minh`.
3. Inventory represents a cabin product on one departure.
4. Price records preserve both `ticket_price_vnd` and derived `cabin_price_vnd` for auditability.
5. Holds temporarily reserve inventory with a short expiry.
6. Orders snapshot route, schedule, product, fare, tax, and customer data at purchase time.

Create or extend inventory through one atomic Postgres function/RPC. Lock the inventory row, remove expired holds, verify capacity, insert the hold and order snapshot, then commit. Never perform payment-provider HTTP calls while holding a database transaction or row lock.

Use integer VND amounts, timezone-aware timestamps, explicit check constraints, indexed foreign keys, and uniqueness constraints that make retries safe. Treat an idempotency key as part of every public mutation.

## Supabase access boundary

- Browser clients may read only published public schedule/fare projections and may submit validated booking intents through server routes or narrowly scoped RPCs.
- Anonymous users cannot list orders, passengers, holds, payments, payment events, admin profiles, or audit logs.
- The Supabase service-role key is server-only and must never use a `NEXT_PUBLIC_` name.
- Admin access uses Supabase Auth sessions plus role checks; a local-storage bearer token is not a production authorization boundary.
- Enable RLS and explicit grants together. Add indexes for every foreign key and policy predicate.
- Return a minimal public receipt keyed by a high-entropy reference plus a separate verification factor when lookup is required. Do not expose passenger PII from a public collection endpoint.

## Implementation order

1. Add versioned Supabase migrations and generated TypeScript database types.
2. Seed catalog/timetable data without deleting operational rows.
3. Add server-only repositories and atomic hold/order RPCs.
4. Switch public schedule search to dated departures and inventory.
5. Switch booking submission from JSON files to Postgres.
6. Add expiry/release jobs and concurrency tests.
7. Only then connect a payment gateway using `violette-payment-gateways`.

Preserve a rollback path while migrating: dual-read comparison is acceptable; dual-write is allowed only with a documented reconciliation rule and one declared source of truth.

## Verification

- Run migrations from an empty local project and against a realistic seeded database.
- Test two simultaneous attempts for the last cabin; exactly one may succeed.
- Test expired holds, duplicate idempotency keys, round-trip partial failure, admin price changes after hold creation, and SE19/VIP2 restrictions.
- Test RLS with `anon`, ordinary authenticated, admin, and service-role contexts.
- Run `npm run type-check`, integration tests, and `npm run build`.
