---
name: violette-admin-operations
description: Build or change Violette Train's authenticated admin workflows for daily schedules, dated departures, cabin capacity, ticket fares, booking queues, staff roles, and audit history. Use for admin pages/APIs and daily operations; do not use for public marketing UI or gateway cryptography.
---

# Violette Admin Operations

Make operational edits safe, fast, attributable, and understandable on desktop and tablet. The admin interface is not a second source of truth; it edits Supabase records through authenticated server boundaries.

## Security boundary

- Replace shared fallback credentials and browser `localStorage` bearer tokens with Supabase Auth sessions in secure, `HttpOnly`, `SameSite` cookies.
- Fail closed when required secrets or role mappings are missing. Never ship default production credentials.
- Enforce authorization in the server route/database, not only by hiding navigation.
- Suggested roles: `admin`, `operations`, `pricing`, `support`. Grant the smallest action set needed.
- Require step-up confirmation and a reason for cancellation, refund, capacity override, bulk publish, or destructive changes.
- Append audit events for every create/update/publish/cancel/override; do not allow clients to edit audit rows.

## Daily operations model

Read [references/daily-operations.md](references/daily-operations.md) when changing schedules, inventory, price editing, bulk actions, or the booking queue.

Separate recurring templates from dated departures. Staff usually work on a date range, not on a timeless schedule record. Default the operational timezone to `Asia/Ho_Chi_Minh` and show exact last-updated time and editor.

Admin price editing always displays and stores:

- one-ticket fare;
- full-cabin price = one-ticket fare × four;
- whether the product is standard or VIP2;
- VIP2 availability restricted to SE19 and capacity at most one;
- effective date/departure scope before save.

Never let admin copy text, hardcoded route dropdowns, or page-local arrays become canonical business data. Forms load station, route, train, and product options from the database.

## UX contract

- Use a date-first schedule/inventory grid on wide screens and stacked departure cards on narrow screens.
- Preserve a readable table header, keyboard navigation, visible focus, 44px touch targets, inline validation, and an `aria-live` save result.
- Provide filters for service date, train, route, status, product, and low/sold-out capacity; keep filters in the URL.
- Show unsaved changes and protect navigation. Use optimistic concurrency (`updated_at`/version) so one editor does not overwrite another silently.
- Bulk actions require preview: affected departures, before/after values, validation errors, and rollback guidance.
- Public-facing labels are maintained in Vietnamese and English. Admin can be Vietnamese-first but operational identifiers remain stable.

## Verification

- Test each role against every mutation route and RLS policy.
- Test concurrent edits, stale versions, partial bulk failure, timezone boundaries, and cancelled departures.
- Verify edits appear in public search only after the intended publish action.
- Confirm every material mutation creates one audit row with actor and correlation ID.
- Run `npm run type-check`, relevant API/UI tests, responsive browser checks, and `npm run build`.
