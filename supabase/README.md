# Supabase setup for Violette Admin

The admin application fails closed until Supabase is configured.

## 1. Create and link a Supabase project

Install the Supabase CLI, authenticate, then run from the repository root:

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

For the local Docker stack on Windows, use the checked-in `config.toml` and start only the services needed by the app:

```bash
npx supabase start --exclude mailpit,studio,vector,logflare
npx supabase db reset
```

This repository maps the local API to `http://127.0.0.1:55421` and the database to port `55432` because the default Supabase ports may be reserved by Windows. Run `npx supabase status` to copy the local anon key into `.env.local`.

The migrations create the operational catalog, dated departures, inventory, fares, orders, atomic cabin holds, passengers, payment attempts/events, audit logs, RLS policies, and transactional booking/payment functions.

## 2. Configure the app

Copy `.env.example` to `.env.local` and set:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVER_ONLY_SERVICE_ROLE_KEY
BOOKING_DATA_SOURCE=supabase
```

Do not add a service-role key to any `NEXT_PUBLIC_` variable. It is used only by server-side checkout and verified payment callbacks.

## 3. Create the first admin

In Supabase Dashboard, open **Authentication → Users**, create the user, and copy its UUID. Then run this in the SQL editor with the real values:

```sql
insert into public.admin_profiles (user_id, display_name, role)
values ('AUTH_USER_UUID', 'Violette Admin', 'admin');
```

Available roles are `admin`, `operations`, `pricing`, and `support`. The first operations release allows schedule/catalog mutation only for `admin` and `operations`.

## 4. Verify

1. Open `/admin/login` and sign in with the Supabase Auth email/password.
2. Add at least two stations and one train.
3. Add a directional route.
4. Create a dated departure and verify both the one-ticket fare and cabin total (`ticket × 4`).
5. Verify a non-SE19 train cannot receive VIP2 inventory.
6. Check `public.audit_logs` for the created records.

## 5. Verify commerce and payment

1. Publish an outbound departure and, for a round trip, its reverse departure.
2. Search the same route/date on `/vi/booking`; unpublished departures must not appear.
3. Create a booking and verify one cabin is held on every selected leg for 15 minutes.
4. With `PAYMENT_FAKE_ENABLED=true` in local development, complete the simulated checkout.
5. Verify the order is `confirmed`, the payment is `paid`, and replaying the callback does not consume inventory twice.
6. Open `/admin/orders` and confirm the order is visible while customer email/phone remain masked in the list.

For VNPay, set `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET`, and `VNPAY_PAYMENT_URL`. The server callback is `/api/payments/vnpay/ipn`; the browser return handler is `/api/payments/vnpay/return`.
