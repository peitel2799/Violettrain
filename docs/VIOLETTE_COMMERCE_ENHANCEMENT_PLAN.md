# Violette Train commerce enhancement plan

Status: architecture and implementation roadmap  
Prepared: 2026-10-04  
Target stack: Next.js 15, React 19, TypeScript, Tailwind CSS 4, `next-intl`, Supabase/Postgres, VNPay, MoMo

## 1. Executive decision

Violette should evolve from a marketing site with a booking-request form into a server-authoritative ticket-commerce product in this order:

1. Preserve and sharpen the public UI, pricing clarity, real train imagery, and contact conversion.
2. Replace JSON persistence and static “availability” with Supabase, dated departures, cabin inventory, holds, orders, RLS, and audit logs.
3. Replace the shared admin token with Supabase Auth and role-based daily operations.
4. Add a fake payment adapter and prove order/idempotency behavior.
5. Integrate VNPay sandbox first, then MoMo behind the same provider interface.
6. Launch only after concurrency, callback replay, reconciliation, accessibility, and responsive checks pass.

Do not attach online payment directly to the current JSON store. A payment can succeed even if a browser closes or a server retries; without durable orders, atomic holds, and idempotent callbacks, the site can lose paid orders or oversell a cabin.

## 2. Skill repository analysis

There is no single credible GitHub repository that precisely covers distinctive UI, Next.js performance, Supabase/Postgres, Violette's cabin rules, daily train operations, and Vietnam-specific VNPay/MoMo payment behavior.

The closest broad repository evaluated was [wshobson/agents](https://github.com/wshobson/agents). It has generic frontend, database, security, and payment skills, but it is a large multi-domain collection and its payment coverage is not a substitute for current VNPay/MoMo contracts. Installing it wholesale would add significant unrelated routing context.

The project therefore uses a curated, source-specific skill stack:

| Source | Added skill | Why it is used | Source commit checked |
|---|---|---|---|
| [anthropics/skills](https://github.com/anthropics/skills/tree/main/skills/frontend-design) | `frontend-design` | Distinctive, subject-led visual direction and rendered critique | `8a1541c4a3ffa5a20a5a91de0dcf3f0bab1d1ef4` |
| [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) | `react-best-practices` | Next.js/React performance, server/client boundaries, bundle and render discipline | `063bee94c3f4df8453406c830b0a7df0f2860278` |
| [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills/tree/main/skills/web-design-guidelines) | `web-design-guidelines` | Accessibility, forms, focus, responsive behavior, images, locale, UX audit | same commit above |
| [supabase/agent-skills](https://github.com/supabase/agent-skills/tree/main/skills/supabase-postgres-best-practices) | `supabase-postgres-best-practices` | Schema, constraints, indexes, RLS, concurrency, migrations | `c9be0e931b7930f7d02126d04774d904c381e7d7` |

Project-specific skills added because no upstream skill knows Violette's exact domain:

| Skill | Responsibility |
|---|---|
| `violette-landing-booking` | Public bilingual UI, real imagery, price/schedule/contact presentation, booking conversion |
| `violette-ticket-commerce` | Supabase dated departures, fares, inventory, holds, orders, passengers, oversell protection |
| `violette-admin-operations` | Staff auth, daily schedule/capacity/fare changes, queue, roles, audit |
| `violette-payment-gateways` | VNPay/MoMo checkout, signatures, IPN, idempotency, reconciliation, refunds |

Payment specifications must be rechecked before implementation against [VNPay's official gateway documentation](https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html), [MoMo's official collection-link contract](https://developers.momo.vn/v3/vi/docs/payment/api/collection-link/), and [MoMo's official IPN contract](https://developers.momo.vn/v3/vi/docs/payment/api/result-handling/notification/).

## 3. Current-state assessment

### What already exists

- Bilingual Vietnamese/English public routes and localized booking flow.
- Real train, cabin, dining, station, and brand images under `public/`.
- Home, cabins, booking, about, contact, blog/news, footer contact information, and admin pages.
- Schedule reference data and route-fare logic.
- Corrected public presentation of one-ticket fare and full-cabin total.
- Existing product rule in code: full cabin is four tickets; VIP2 restricted to SE19.
- Admin screens for routes, schedules, pricing, bookings, reports, and settings.
- Email and contact plumbing suitable for an inquiry prototype.

### Blocking gaps before real sales

| Severity | Gap | Why it blocks online sales |
|---|---|---|
| Critical | Bookings and schedules persist to local JSON | Not durable on serverless deployment; concurrent writes can race or disappear |
| Critical | Public booking collection/status routes expose or mutate data too broadly | Passenger PII and order integrity risk |
| Critical | Admin uses a shared bearer token in `localStorage` with a development fallback | XSS/session theft and accidental default-secret risk |
| Critical | No dated, atomic cabin inventory/hold transaction | Two customers can buy the same last cabin |
| Critical | Payment state is only a data field; no verified gateway/IPN lifecycle | Cannot prove money received or safely handle retries |
| High | Timetable snapshot is treated like bookable availability | Reference schedules are not live inventory |
| High | Admin schedule options are hardcoded in UI | Data can disagree between admin, APIs, and public pages |
| High | No audit/concurrency control for daily edits | Staff can overwrite each other with no reliable history |
| High | Current data snapshot does not include a verified SE19 service | VIP2 cannot be sold correctly until an actual dated SE19 schedule is supplied and verified |
| Medium | UI contains many `transition-all` patterns and some accessibility debt | Visual polish and focus/performance quality are inconsistent |

## 4. Product contract

### Cabin and fare rules

- One ticket keeps its configured fare, for example 1,800,000; 1,900,000; 2,100,000 VND.
- One cabin is the mandatory sale unit and costs exactly the one-ticket fare multiplied by four, before separately declared tax/fees/discounts.
- Standard/full cabin is available on supported trains and has fixed upper berths.
- VIP2 is available only on train SE19, has four tickets/two upper folding berths, and Violette has exactly one VIP2 cabin.
- Passenger count can be one through four but the order always consumes and charges one cabin.
- Round trip consumes and charges one cabin on each leg.
- Public UI always labels whether a value is “1 vé” or “1 cabin · 4 vé”. The cabin total is visually dominant at the purchase decision.

### Order truth

- A booking request is not a confirmed ticket.
- A temporary cabin hold is not payment.
- A browser return from a payment provider is not payment authority.
- Only a verified server-to-server IPN/webhook or explicit reconciled provider query can mark payment paid.
- “Confirmed” means the payment state and inventory state agree.
- Ticket issuance is a later fulfillment event and can be modeled separately from payment confirmation.

## 5. Target architecture

```text
Public Next.js UI
  ├─ marketing, imagery, contact, SEO
  └─ schedule search and booking flow
             │
             ▼
Next.js server routes / server-only services
  ├─ validate input and recompute price
  ├─ authenticated admin boundary
  ├─ payment provider adapters
  └─ email/notification jobs
             │
             ▼
Supabase Postgres
  ├─ catalog + recurring templates + dated departures
  ├─ cabin inventory + fares + holds
  ├─ orders + legs + passengers
  ├─ payments + idempotent payment events
  ├─ admin roles + audit logs
  └─ atomic booking/payment functions with RLS
             ▲
             │ server-to-server
       VNPay IPN / MoMo IPN
```

The browser uses a Supabase publishable key only for genuinely public, RLS-safe reads if needed. All privileged writes, payment signing, callbacks, emails, and service-role operations stay on the server.

## 6. Target data model

### Catalog

- `stations`: stable code, Vietnamese/English names, active flag.
- `routes`: from/to station, bookable flag, display order.
- `trains`: train number, active flag, product capabilities.
- `cabin_products`: `standard` and `premium`, tickets per cabin fixed at four.
- `service_templates`: recurring train, route, station times, operating weekdays, source URL and verification date.

### Daily operations

- `departures`: one service template on one operating date; draft/published/cancelled/departed.
- `departure_inventory`: capacity, blocked cabins, committed demand by cabin product.
- `departure_prices`: one-ticket fare, generated/enforced four-ticket cabin total, currency, scope/effective dates.
- `inventory_holds`: one cabin, expiry, release/consume timestamps.

### Commerce

- `orders`: public reference, idempotency key, contact, locale, order/payment status, amount snapshots, expiry.
- `order_legs`: outbound/return snapshots with route, train, times, product and price.
- `passengers`: one to four occupants with minimized required PII.
- `payments`: provider, request/reference IDs, amounts, normalized and raw provider status.
- `payment_events`: deduplicated verified callbacks with redacted payload and processing result.
- `admin_profiles`: Supabase Auth user to role mapping.
- `audit_logs`: append-only actor/action/before/after/correlation data.

### Database rules

- Integer `bigint` VND fields; no float arithmetic for money.
- `timestamptz` for created/updated/expiry/event times.
- Unique keys for dated departures, inventory rows, merchant references, provider transaction IDs, and idempotency keys.
- Check constraints for non-negative capacity/amounts and legal state combinations.
- Index every foreign key and the filters used by public search, admin queues, RLS, and expiry jobs.
- Public read access only to published schedule/fare projections; no anonymous order/passenger/payment collection access.

## 7. Target APIs

Names are proposed and can be implemented as route handlers plus server services/RPCs.

### Public read

- `GET /api/departures?from=&to=&date=&locale=`: published dated departures, remaining cabin state, one-ticket fare, cabin total.
- `GET /api/products`: public product facts and train restrictions.
- `GET /api/orders/:reference/status`: minimal status with a second verification factor or authenticated ownership; never a public booking list.

### Booking and checkout

- `POST /api/orders`: validate passenger/contact data, recompute product eligibility and price, atomically create order plus hold, return expiry and checkout methods.
- `POST /api/orders/:reference/checkout`: create a provider checkout from the stored payable order; idempotent.
- `POST /api/orders/:reference/cancel`: release unpaid hold or create an authenticated cancellation request.

### Gateway

- `GET /api/payments/vnpay/return`: verify display data and render/poll order status; does not mark paid.
- `GET /api/payments/vnpay/ipn`: verify HMAC/checksum, amount, reference and state; atomically apply event and return VNPay response code.
- `GET /api/payments/momo/return`: display/poll only.
- `POST /api/payments/momo/ipn`: verify signature and stored fields, apply idempotently, respond 204 within provider limit.

### Admin

- Server-authenticated CRUD for templates, dated departures, inventory, prices, orders and audit queries.
- Mutations include optimistic version and reason where required.
- Bulk endpoints first produce a preview/dry-run, then accept a confirmation token for apply.

## 8. Detailed delivery phases

### Phase 0 — Decisions, source data, and safety baseline

Dependencies: none.  
Effort: medium.  
Purpose: remove ambiguity before schema or gateway code.

Tasks:

- Confirm legal merchant name, tax behavior, refund/cancellation policy, ticket-issuance process, supported currency, and whether displayed totals include VAT.
- Obtain verified SE19 route/times/operating dates and confirm that exactly one VIP2 cabin is sellable.
- Confirm standard cabin capacity for every supported train/date; do not infer capacity from marketing content.
- Confirm public contact address, two phone numbers, email, response hours, and social links.
- Choose first production gateway. Recommendation: VNPay first, MoMo second.
- Obtain separate sandbox credentials and production onboarding requirements; no secrets committed to Git.
- Decide hold duration, recommended initial value 10–15 minutes, subject to gateway expiry behavior.
- Define PII retention, booking cancellation, refund authority, and manual exception owner.
- Close or guard current unauthenticated booking read/update endpoints before any live deployment.

Acceptance criteria:

- Product/routing/capacity/payment policies are written and approved.
- SE19 source data is verified or VIP2 remains hidden.
- No production gateway code starts without sandbox credentials and callback URLs.
- Current public APIs cannot enumerate passenger PII.

### Phase 1 — UI/UX direction and conversion foundation

Dependencies: Phase 0 contact/product facts.  
Effort: medium to large.  
Purpose: make the site beautiful, specific to luxury train travel, and immediately understandable.

Design direction:

- Keep deep violet, restrained gold, and warm real photography.
- Signature moment: a cinematic exterior/cabin image with a compact live booking panel, not a generic SaaS card wall.
- Make train/cabin materials, berth layout, night journey, stations, and hospitality the visual vocabulary.
- Use existing real assets first: train exterior/evening, standard/VIP cabins, dining/kitchen, staff, and station images.
- Keep one memorable visual element per screen; remove repetitive decorative cards/motion.

Tasks:

- Inventory all public images, verify rights/quality, define consistent aspect ratios and localized alt text.
- Rework hero hierarchy: what Violette is, destinations, mandatory full-cabin rule, clear starting ticket/cabin values, primary “Tìm chuyến” action.
- Add persistent but non-obstructive contact actions: phone, email/contact page, optional Zalo only after an official account URL is supplied.
- Design schedule cards around departure/arrival/date/train, availability truth, “1 vé”, and dominant “1 cabin · 4 vé”.
- Add cabin comparison with fixed/folding upper-berth facts and SE19 badge for VIP2.
- Make booking summary sticky on desktop and inline on mobile without covering focused fields.
- Replace broad `transition-all` with explicit transition properties; honor reduced motion.
- Add skip link, semantic headings, focus-visible states, complete labels/autocomplete, inline errors and `aria-live` async status.
- Format dates/currency using locale-aware `Intl` utilities.
- Verify 390×844, 500×1100, 768×1024, 1024×768, and 1440×1000.
- Capture screenshot evidence for Vietnamese and English at mobile/tablet/desktop.

Acceptance criteria:

- A new visitor understands route, product, per-ticket price, mandatory cabin total, and contact method within the first viewport.
- No horizontal overflow or hidden primary action at target widths.
- All core flow actions are keyboard-operable with visible focus and 44px touch targets.
- Images have correct dimensions/sizes/priority and no avoidable layout shift.
- Vietnamese/English labels do not truncate or overlap.

### Phase 2 — Supabase project and schema foundation

Dependencies: Phase 0 data rules.  
Effort: large.  
Purpose: create the durable operational source of truth.

Tasks:

- Create development/staging/production Supabase projects and document region, backup/PITR choice, branching strategy, and owner access.
- Install `@supabase/supabase-js` and `@supabase/ssr` versions compatible with this Next.js app.
- Add environment schema validation for public URL/key and server-only service role.
- Add local Supabase config and versioned SQL migrations.
- Create catalog, timetable, departure, inventory, price, order, passenger, payment, role, and audit tables.
- Add checks, foreign keys, unique constraints, indexes, grants, and RLS in the same migration series.
- Add generated TypeScript database types and a CI drift check.
- Add seed importer from `data/train-database.json`; retain source URL and verification date.
- Add a safe one-time importer for existing synthetic/test bookings only after PII review.
- Build server-only repository interfaces so route handlers do not call Supabase ad hoc.
- Test all policies as anon, authenticated non-admin, each admin role, and service role.

Acceptance criteria:

- Empty local database migrates and seeds deterministically.
- Staging migration preserves existing data and can be restored from backup.
- Anonymous users can read only published public projections.
- Anonymous/authenticated ordinary users cannot enumerate passengers, orders, payment events, roles or audit logs.
- Service-role key is absent from client bundles and logs.

### Phase 3 — Dated departures, inventory, and price engine

Dependencies: Phase 2.  
Effort: large.  
Purpose: make schedule and availability real and editable daily.

Tasks:

- Convert recurring service templates into dated departure drafts for a selected range.
- Model overnight arrival day offsets correctly in `Asia/Ho_Chi_Minh` and UTC.
- Create inventory rows per departure/product with capacity, blocked and committed demand.
- Enforce VIP2 only on SE19 and capacity ≤1 at both application and database layers.
- Store one-ticket fare and enforce cabin total = fare ×4.
- Create published schedule/fare projection or RPC for efficient public search.
- Implement atomic hold RPC using row lock/transaction and idempotency key.
- Implement hold expiry job in bounded batches.
- Implement round-trip two-leg atomic hold.
- Switch `/api/schedules` from reference snapshot to dated published data while retaining a feature flag/rollback path.
- Add load/concurrency tests for the final cabin.

Acceptance criteria:

- Two simultaneous buyers cannot hold the same final cabin.
- Price shown at checkout comes from the same server snapshot stored on the order.
- Admin future price changes do not alter active hold quotes or historical orders.
- Unverified/missing SE19 departures never expose VIP2.
- Public response distinguishes available, sold out, closed, cancelled, and unknown instead of inventing seat counts.

### Phase 4 — Production admin authentication and daily operations

Dependencies: Phases 2–3.  
Effort: large.  
Purpose: allow authorized staff to update daily data without deploys.

Tasks:

- Replace shared token login with Supabase Auth server sessions in secure cookies.
- Create role matrix for admin, operations, pricing, and support.
- Guard admin layouts and every API mutation server-side; enforce matching RLS.
- Remove production fallback username/password/secret behavior and local-storage tokens.
- Build date-first departures screen with filters in URL.
- Generate/edit/publish/cancel dated departures with dry-run preview.
- Edit capacity with committed-demand guard and override workflow.
- Edit one-ticket fare with live full-cabin ×4 preview and clear scope.
- Replace hardcoded route dropdowns with database-backed selectors.
- Add booking/payment exception queues with masked list-view PII.
- Add optimistic concurrency and conflict resolution UI.
- Add append-only audit trail and actor/reason display.
- Make admin responsive at 390, 768, 1024, and 1440 widths.

Acceptance criteria:

- Staff can change tomorrow's schedule, price and capacity without redeploying.
- Unauthorized roles receive server denial even when calling endpoints directly.
- Two editors cannot silently overwrite each other.
- Every material change has one audit event.
- Public search sees only published changes within the documented cache window.

### Phase 5 — Order and pre-payment checkout

Dependencies: Phases 3–4.  
Effort: large.  
Purpose: replace booking inquiry with a durable, recoverable commerce order.

Tasks:

- Create shared Zod schemas for passenger/contact/order input and normalize phone/email.
- POST order through one server-owned operation: validate, recompute, hold, snapshot and return.
- Support one-way and atomic round-trip orders.
- Show visible hold countdown and exact expiration in local timezone.
- Prevent double submit and use stable idempotency keys.
- Build order status page that shows pending/paid/confirmed/expired/manual review truthfully.
- Move email notification behind successful persistence; prevent duplicate receipts.
- Add operator alert for exception states.
- Keep inquiry mode behind a feature flag until payment is ready; do not mix inquiry “success” copy with paid confirmation.
- Add fake provider so the entire success/failure/retry flow is testable before real gateway credentials.

Acceptance criteria:

- Refresh/back/retry returns the same idempotent order where appropriate.
- Failed persistence never shows success.
- Hold expiration releases inventory and the UI offers a new search.
- Passenger count 1–4 always charges one four-ticket cabin per leg.
- Public endpoints return no booking collection or excess PII.

### Phase 6 — VNPay sandbox integration

Dependencies: Phase 5 and VNPay sandbox account.  
Effort: large.  
Purpose: first online payment method.

Tasks:

- Implement payment-provider interface and VNPay adapter.
- Generate signed 2.1.0 payment URL server-side using current official HMAC-SHA512 rules.
- Convert VND amount to VNPay's specified amount representation exactly once.
- Add unique merchant reference/request record before redirect.
- Implement return page as display/poll only.
- Implement IPN verification, amount/reference/status checks and exact response contract.
- Apply payment event, consume hold and confirm order atomically.
- Store provider transaction number and redacted event metadata.
- Add query transaction and reconciliation job for pending/missing callbacks.
- Add admin manual-review workflow for invalid signature, amount mismatch, unknown reference and late success.
- Test callback retries and timeouts using publicly reachable staging HTTPS.
- Complete provider sandbox checklist/certification evidence.

Acceptance criteria:

- Ten replays of one valid IPN create one payment transition, one inventory consumption and one receipt.
- Invalid checksum or wrong amount never marks paid.
- Closing browser after paying still results in correct status through IPN.
- Refreshing return page cannot mutate payment.
- Late success never causes silent oversell.

### Phase 7 — MoMo integration

Dependencies: stable Phase 6 adapter and MoMo sandbox account.  
Effort: medium to large.  
Purpose: second local payment option without duplicating order logic.

Tasks:

- Select the exact MoMo web product/contract; do not mix signature field sets from different products.
- Add adapter-specific HMAC-SHA256 signing with official test vectors.
- Create checkout request with redirect and IPN URLs.
- Implement signature validation and stored partner/order/request/amount comparison.
- Respond to validly handled notifications with HTTP 204 within the documented time.
- Normalize MoMo result codes while retaining original code/message.
- Extend reconciliation and refund workflow using provider-specific query APIs.
- Add provider selector UI with logos/text supplied or licensed by the provider.
- Run the same callback replay, late success, amount mismatch and browser-close matrix used for VNPay.

Acceptance criteria:

- Booking/order code is unchanged except for provider selection.
- MoMo and VNPay events cannot collide due to provider-scoped unique keys.
- IPN handler meets response time and duplicate behavior requirements.
- Turning MoMo off leaves VNPay and inquiry fallback functional.

### Phase 8 — Hardening, observability, and launch

Dependencies: all enabled features.  
Effort: large.  
Purpose: make production behavior measurable and recoverable.

Tasks:

- Add structured logs with correlation/order/payment IDs and automatic PII/secret redaction.
- Add error tracking, uptime checks, callback failure alerts, pending-payment age alerts, inventory anomaly alerts and email-delivery alerts.
- Add daily reconciliation dashboard and signed operational runbook.
- Add rate limits and bot protection on public mutations/contact/newsletter endpoints.
- Add Content Security Policy and review third-party scripts.
- Define backup/restore test, migration rollback, gateway kill switch and inquiry-mode fallback.
- Run dependency/security audit and verify no secrets in Git history/client bundles.
- Add unit tests for price/signature/state mapping, database integration/concurrency tests, API contract tests, and Playwright happy/failure paths.
- Run accessibility audit, Lighthouse/Core Web Vitals review and real-device checks.
- Perform staged launch: internal staff → limited traffic → one gateway → full traffic → second gateway.
- Monitor first live transactions manually with provider portals and Supabase audit evidence.

Acceptance criteria:

- Recovery runbook is executable by someone other than the developer.
- Gateway can be disabled without taking schedule search or inquiry fallback offline.
- Alerts detect a callback failure or stuck payment before a customer report.
- Restore drill and payment reconciliation drill are documented and pass.
- Production launch checklist has named owner and evidence for every item.

## 9. Test matrix

### Pricing and product

- Ticket fares 1.8m/1.9m/2.1m produce cabin totals 7.2m/7.6m/8.4m.
- Passenger counts one, two, three and four all charge one cabin.
- Round trip charges two cabins.
- VIP2 hidden/rejected on non-SE19.
- VIP2 capacity cannot exceed one.
- Standard upper berths never described as folding.

### Inventory and order

- Last-cabin race.
- Duplicate order idempotency key.
- Expiry job and purchase attempt at exact boundary.
- Round-trip second-leg sold out rolls back first leg.
- Admin lowers capacity during active holds.
- Departure cancellation with unpaid and paid orders.
- Price changes after quote and after confirmation.

### Payment

- Success, user cancel, timeout, provider unavailable.
- Invalid signature/checksum.
- Correct signature but wrong amount/reference/provider.
- Duplicate and out-of-order callbacks.
- Browser closes before return.
- Return arrives before IPN and after IPN.
- IPN arrives after hold expiry.
- Refund initiated, pending, failed, partial and complete where supported.
- Reconciliation recovers missing callback.

### Security/privacy

- Anonymous booking list denied.
- Guessable reference does not reveal PII.
- Non-admin direct endpoint calls denied.
- Pricing role cannot manage users/refunds.
- Support role cannot change price/capacity.
- Service-role and gateway secrets absent from browser/network payloads/logs.
- Audit rows cannot be changed by clients.

### Responsive/accessibility

- VI/EN at 390, 500, 768, 1024 and 1440 widths.
- 200% zoom and keyboard-only booking/payment/admin critical paths.
- Screen-reader labels and live async updates.
- Reduced-motion preference.
- Slow image/network and provider redirect failure.
- Very long passenger names, emails and translated labels.

## 10. Deployment and rollback strategy

Use feature flags with explicit ownership:

- `SUPABASE_BOOKING_READS_ENABLED`
- `SUPABASE_BOOKING_WRITES_ENABLED`
- `ONLINE_PAYMENT_ENABLED`
- `VNPAY_ENABLED`
- `MOMO_ENABLED`
- `INQUIRY_FALLBACK_ENABLED`

Recommended cutover:

1. Deploy schema/RLS with no public traffic.
2. Seed and compare schedule/fare reads against current output.
3. Enable Supabase reads for internal/staging traffic.
4. Enable order writes with fake payment.
5. Enable inquiry fallback and VNPay for controlled production traffic.
6. Reconcile each early transaction manually.
7. Expand VNPay traffic, then add MoMo.
8. Remove JSON write paths only after backup, reconciliation and rollback evidence.

Rollback must disable new checkout while preserving paid callback processing. Never disable an IPN endpoint while outstanding provider sessions may still complete.

## 11. Definition of done

An enhancement is complete only when:

- Business rules and VI/EN copy agree.
- Server/database enforce the rule; UI-only enforcement does not count.
- Empty/loading/error/expired/sold-out/manual-review states exist.
- Authorization and RLS tests pass.
- Idempotency and concurrent retry tests pass.
- Responsive screenshots and keyboard checks pass.
- `npm run type-check` and `npm run build` pass.
- Migrations work from empty and upgraded databases.
- Monitoring, audit evidence and rollback instructions exist.
- No real customer PII, merchant secrets, or payment credentials enter source, test fixtures, screenshots, or logs.

## 12. Recommended first implementation slice

Do not start with payment UI. The first shippable vertical slice should be:

1. Supabase local/staging setup.
2. Stations/routes/trains/products/templates/departures/inventory/prices migrations and RLS.
3. Seed current reference data.
4. Admin authentication plus one date-first schedule/price/capacity screen.
5. Public schedule search from published Supabase departures.
6. Atomic one-way cabin hold with fake payment.
7. Concurrency and responsive verification.

This slice proves the riskiest foundation—daily editable truth and no overselling—before gateway-specific work begins.
