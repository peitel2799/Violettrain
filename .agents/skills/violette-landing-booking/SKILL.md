---
name: violette-landing-booking
description: Build, review, or repair the Violette Train Next.js landing page and passenger booking-request workflow, including bilingual UX, server-side inquiry persistence, and operator alerts. Use for public-site conversion, booking forms, email notifications, SEO, accessibility, or responsive UI in this repository; do not use for payment gateways, bank reconciliation, accounting, or unrelated admin expansion.
---

# Violette Train Landing and Booking

Keep work aligned with the current MVP: a polished landing page is the primary product, and a passenger can submit a booking inquiry that alerts the Violette operator. Payment is not part of this phase.

## Product contract

Apply these priorities when repository documents or legacy code disagree:

1. Make the landing page explain the offer quickly and move visitors toward one clear booking CTA.
2. Let a passenger choose a trip and cabin, enter contact/passenger details, and submit a booking **request**.
3. Persist the request with a server-generated reference and `pending` status, then alert the operator with enough information to follow up.
4. Optionally acknowledge receipt to the passenger, but never describe an inquiry as a confirmed reservation or issued ticket.
5. Do not add checkout, card collection, QR payment, VNPay, MoMo, payment status, bank matching, debt tracking, or revenue logic unless the user explicitly starts a later payment phase.

Treat `SPEC.md` as brand and content context, not as authority for its stale payment, five-step booking, or broad admin roadmap. Do not delete or refactor the existing admin/accounting area merely because it is outside the public MVP.

## Repository map

- Framework: Next.js 15 App Router, React 19, TypeScript, Tailwind CSS 4, `next-intl` 3, React Hook Form, Zod, Nodemailer, and Vercel.
- Landing page composition: `src/app/[locale]/page.tsx` and `src/components/home/`.
- Main conversion hero: `src/components/home/VietnamMapHero.tsx`.
- Booking flow: `src/app/[locale]/booking/page.tsx` and `src/components/booking/`.
- Public server endpoints: `src/app/api/schedules/`, `src/app/api/bookings/`, and `src/app/api/booking/email/`.
- Booking/email server code: `src/lib/admin-store.ts` and `src/lib/email.ts`.
- Canonical train reference data: `data/train-database.json` with client-safe accessors in `src/lib/train-database.ts`. It contains the versioned DSVN timetable snapshot, station distances, bookable routes, and route base fares; do not recreate schedule arrays elsewhere.
- Shared public domain data: `src/lib/constants.ts`, `src/lib/types.ts`, `src/lib/cabin-products.ts`, and `src/lib/product-pricing.ts`.
- Locale configuration and navigation: `src/i18n/routing.ts`, `src/i18n/request.ts`, `src/i18n/messages/`, and `src/middleware.ts`.
- Brand assets and design tokens: `public/` and `src/app/globals.css`.

Inspect the live code before relying on this map; keep this skill current when architecture or product scope changes.

## Work the public conversion path first

For any public-site change, trace the smallest relevant vertical slice:

`landing CTA -> locale-aware booking route -> trip/cabin choice -> passenger form -> server intake -> durable pending request -> operator alert -> receipt screen`

Prefer improvements that reduce friction or increase trust along this path. Keep secondary pages and internal tooling behind landing clarity, booking correctness, reliable alerts, mobile usability, and SEO.

Before editing, inspect `git status` and preserve the user's unrelated work. The worktree may already contain payment removals and other in-progress changes.

## Next.js and React conventions

- Keep pages and layouts as Server Components by default. Add `'use client'` only around state, events, browser APIs, or animation; avoid pulling static landing sections into a large client bundle.
- In this Next.js 15 codebase, route `params` and `searchParams` can be promises. Await them in pages, layouts, metadata, and dynamic handlers as required by the installed version.
- Use App Router Route Handlers under `src/app/api/**/route.ts` for the existing HTTP boundary. Treat every public mutation as an untrusted public endpoint.
- Put SMTP credentials, storage credentials, price derivation, booking-reference generation, and notification recipients in server-only modules. Never expose them through `NEXT_PUBLIC_*` variables or client props.
- Validate and normalize request bodies on the server with a shared Zod schema. Client validation improves UX but is never authoritative.
- Derive authoritative route, schedule, cabin, passenger limit, and displayed price on the server. Do not trust a client-supplied booking reference, total, status, route label, or train details.
- Treat the DSVN schedule snapshot as timetable reference data, not live inventory. Preserve its source URL and verification date, show overnight day offsets, represent unknown availability honestly, and re-verify DSVN before changing times.
- Keep public responses minimal. Do not return booking lists or passenger PII from unauthenticated `GET` endpoints.
- Use `next/image` with meaningful localized alt text, correct `sizes`, and `priority` only for the actual above-the-fold image. Lazy-load noncritical imagery and heavy interactive sections.
- Use Next.js metadata APIs in Server Components for localized titles, descriptions, canonicals, alternates, Open Graph data, `robots.ts`, and `sitemap.ts`.

## Booking intake and alert invariants

Prefer one server-owned booking-intake operation. It should:

1. Parse and validate the complete payload.
2. Recalculate trusted fields and generate the reference on the server.
3. Persist one idempotent `pending` inquiry before reporting success.
4. Send the operator alert to a server-only recipient such as `BOOKING_ALERT_TO`; do not hard-code a private address in client code.
5. Send the passenger a clearly worded receipt only after persistence succeeds, if acknowledgement email is enabled.
6. Return an explicit result that distinguishes request persistence from notification delivery.

Prevent duplicate submissions while pending and support an idempotency key or equivalent duplicate check. Never show a success screen after a failed persistence response. If persistence succeeds but an alert fails, retain the inquiry, record the alert failure safely, show an honest recoverable state, and make retry possible without creating another booking.

Use synthetic passenger data in development and tests. `data/bookings.json` contains private-looking records; do not quote, publish, or log passenger names, email addresses, or phone numbers. Do not rely on repository JSON writes as durable production storage on Vercel Functions; use an approved durable store before treating the deployed booking ledger as reliable.

## Bilingual experience

- Preserve Vietnamese and English for every passenger-facing string. Update both `src/i18n/messages/vi.json` and `src/i18n/messages/en.json` when adding translation keys.
- Use the wrappers exported by `@/i18n/routing` for locale-aware links and navigation instead of manually assembling `/vi` or `/en` paths.
- Keep `vi` as the configured default and honor the current `localePrefix: 'always'` behavior plus middleware redirects.
- Format dates, times, names, phone numbers, and VND amounts consistently for the active locale. Keep source files UTF-8 and verify Vietnamese characters visually when touching copy.
- Do not place reusable visible copy in component conditionals when it belongs in the message files; short asset-specific alt text is acceptable when the existing component follows that pattern.

## Landing-page quality bar

- Preserve the deep-violet, gold-accent, warm-photography design language in `globals.css`; reuse existing tokens before inventing colors or spacing.
- Make the first viewport communicate what Violette is, where it goes, what a cabin costs or how pricing works, and one primary action.
- Keep claims, routes, fares, availability, contact details, and response-time promises grounded in repository data or user-provided facts. Do not invent testimonials or operational guarantees.
- Maintain semantic headings, keyboard-visible focus, form labels, useful errors, `aria-live` status for async submission, sufficient contrast, reduced-motion support, and 44px-or-larger touch targets.
- Check narrow mobile screens first, then tablet and desktop. Avoid horizontal overflow and layout shifts.

## Known intake risks to re-check

At the time this skill was created, the public booking path had these risks. Verify current code before acting, fix only when relevant to the request, and remove resolved notes from this skill:

- `/api/bookings` accepted client-owned references, prices, status, and trip details with presence-only validation.
- Its public `GET` returned stored bookings and passenger PII without an admin guard.
- The browser performed separate booking and email requests and did not consistently reject non-2xx responses.
- Email delivery targeted the passenger but did not implement the required operator alert.
- JSON file persistence was suitable for local prototyping, not a durable Vercel production ledger.
- Legacy types, seed data, copy, and `SPEC.md` still contained payment concepts even though payment routes and UI were being removed.

## Verification

Run checks proportional to the change, using the repository scripts:

1. `npm run type-check` because `next.config.ts` currently allows build-time type errors.
2. Run `npm run lint` only after an ESLint config exists. It currently opens an interactive setup prompt, so do not report its zero exit code as a successful lint result.
3. `npm run build` for route, server/client-boundary, metadata, and production compilation checks.
4. Exercise Vietnamese and English landing-to-receipt flows at mobile and desktop widths.
5. Test invalid input, duplicate submit, storage failure, operator-alert failure, and missing SMTP configuration for booking work.

Do not weaken type checks or build checks to make a change pass. Report any pre-existing failure separately from failures introduced by the current work.

## Framework references

Consult only the reference relevant to the task:

- [Next.js 15 Server and Client Components](https://nextjs.org/docs/15/app/getting-started/server-and-client-components)
- [Next.js 15 Route Handlers](https://nextjs.org/docs/15/app/getting-started/route-handlers-and-middleware)
- [Next.js 15 forms and server validation](https://nextjs.org/docs/15/app/guides/forms)
- [Next.js 15 data security](https://nextjs.org/docs/15/app/guides/data-security)
- [Next.js 15 metadata and Open Graph images](https://nextjs.org/docs/15/app/getting-started/metadata-and-og-images)
- [`next-intl` routing setup and navigation](https://next-intl.dev/docs/routing/setup)
- [Vercel Function filesystem limitation](https://vercel.com/kb/guide/why-does-my-serverless-function-work-locally-but-not-when-deployed)
- [Vercel React and Next.js performance skill](https://github.com/vercel-labs/agent-skills/tree/main/skills/react-best-practices)
