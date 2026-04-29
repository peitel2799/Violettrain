# Violette Train Website — Complete Summary

## Live Site
**URL**: `https://violettetrain.vn` (placeholder)
**Stack**: Next.js 15.2.2 + TypeScript + Tailwind CSS v4 + App Router
**i18n**: Vietnamese (vi) + English (en) via next-intl 3.26.3

---

## Pages

| Route | File | Status |
|-------|------|--------|
| `/[locale]/` | `src/app/[locale]/page.tsx` | Complete |
| `/[locale]/booking` | `src/app/[locale]/booking/page.tsx` | Complete |
| `/[locale]/cabins` | `src/app/[locale]/cabins/page.tsx` | Complete |
| `/[locale]/news` | `src/app/[locale]/news/page.tsx` | Complete |
| `/[locale]/blog` | `src/app/[locale]/blog/page.tsx` | Complete |
| `/[locale]/blog/[slug]` | `src/app/[locale]/blog/[slug]/page.tsx` | Complete |
| `/[locale]/about` | `src/app/[locale]/about/page.tsx` | Complete |
| `/[locale]/contact` | `src/app/[locale]/contact/page.tsx` | Complete |
| `/[locale]/admin` | `src/app/[locale]/admin/page.tsx` | Complete |
| `/[locale]/admin/login` | `src/app/[locale]/admin/login/page.tsx` | Complete |
| `/[locale]/admin/bookings` | `src/app/[locale]/admin/bookings/page.tsx` | Complete |
| `/[locale]/admin/routes` | `src/app/[locale]/admin/routes/page.tsx` | Complete |
| `/[locale]/admin/pricing` | `src/app/[locale]/admin/pricing/page.tsx` | Complete |
| `/[locale]/admin/promo-codes` | `src/app/[locale]/admin/promo-codes/page.tsx` | Complete |
| `/[locale]/admin/schedules` | `src/app/[locale]/admin/schedules/page.tsx` | Complete |
| `/[locale]/admin/settings` | `src/app/[locale]/admin/settings/page.tsx` | Complete |

## API Routes

| Route | Method | Status |
|-------|--------|--------|
| `/api/schedules` | GET | Complete |
| `/api/pricing` | GET | Complete |
| `/api/news` | GET | Complete |
| `/api/contact` | POST | Complete |
| `/api/newsletter` | POST | Complete |
| `/api/booking/email` | POST | Complete |
| `/api/payments/vnpay` | POST | Complete |
| `/api/payments/vnpay/return` | GET | Complete |
| `/api/payments/vnpay/ipn` | POST | Complete |
| `/api/payments/momo` | POST | Complete |
| `/api/payments/momo/return` | GET | Complete |
| `/api/payments/momo/ipn` | POST | Complete |
| `/api/bookings` | GET/POST | Complete |
| `/api/bookings/[ref]` | GET/PATCH | Complete |
| `/api/admin/routes` | GET/PUT | Protected |
| `/api/admin/pricing` | GET/PUT | Protected |
| `/api/admin/stats` | GET | Protected |
| `/api/admin/promo-codes` | GET/POST/DELETE | Protected |
| `/api/admin/bookings` | GET/POST/PATCH | Protected |
| `/api/admin/schedules` | GET/PATCH | Protected |

## Features

### Implemented
- Homepage with 9 sections (Hero, Booking Widget, Why Us, Cabins, Stats, News, Blog, Testimonials, CTA)
- Multi-step booking flow (route select, schedule search, passenger form, payment, confirmation)
- Bilingual support (vi/en) with locale prefix routing
- Cabin class showcase (Standard 4-bed / Premium 2-bed with push-up bunks)
- News hub with category filtering (news/policy/promotion/announcement)
- Marketing blog with category filtering and full article detail pages
- About page and Contact page with live form submission
- Newsletter subscription with API integration
- Booking confirmation email via nodemailer (SMTP or console log in dev)
- 5 train routes, 13 scheduled trains with day-of-week filtering
- Violette's own pricing (VAT included)
- Promotional codes (VIOLETTE10 = 10% off)
- Refund policy display
- Admin dashboard API (stats, bookings, routes, pricing, promo codes, schedules)
- VNPay + MoMo payment gateway integration
- Booking data persistence to JSON file
- Admin API authentication (Bearer token)
- react-hook-form + zod in booking passenger form

### TODO / In Progress
- Real email delivery (needs SMTP credentials in `.env.local`)
- Real VNPay/MoMo credentials for live payments
- Admin dashboard UI (full CRUD pages for routes, pricing, bookings, promo codes, schedules)
- Admin login page with Bearer token authentication
- File-based admin store to database migration (Supabase recommended)

## Architecture

### Data Flow
```
User -> BookingPageContent
         |
         +-- /api/schedules -> dsvn.ts (schedule data)
         |
         +-- /api/bookings (create booking record -> data/bookings.json)
         |
         +-- /api/payments/vnpay (initiate payment)
              |
              v
         Payment Gateway (VNPay/MoMo)
              |
              v
         /api/booking/email -> nodemailer -> SMTP -> Customer inbox
```

### Key Files
| File | Purpose |
|------|---------|
| `src/lib/dsvn.ts` | Schedule data, routes, pricing, news (no external API) |
| `src/lib/email.ts` | Email service with nodemailer |
| `src/lib/admin-store.ts` | JSON file persistence for bookings, routes, pricing |
| `src/lib/admin-auth.ts` | Bearer token auth for admin routes |
| `src/lib/constants.ts` | Blog posts, testimonials, cabin classes, stations |
| `src/lib/types.ts` | All TypeScript interfaces |
| `src/lib/utils.ts` | Shared utilities |
| `data/news.json` | News articles data (6 curated articles) |
| `data/bookings.json` | Booking records (auto-created on first booking) |

### Environment Variables
Copy `.env.example` to `.env.local` and set:
- `SMTP_HOST/PORT/USER/PASS/EMAIL_FROM` — for real email delivery
- `VNP_TMN_CODE/VNP_HASH_SECRET/VNP_URL/VNP_RETURN_URL` — for VNPay
- `MOMO_PARTNER_CODE/MOMO_ACCESS_KEY/MOMO_SECRET_KEY` — for MoMo
- `ADMIN_SECRET_TOKEN` — for protecting admin API routes

## Tech Stack
- Next.js 15.2.2 (App Router, Turbopack)
- React 19
- TypeScript 5.8
- Tailwind CSS v4 (CSS-first config)
- next-intl 3.26.3 (i18n)
- framer-motion 12 (animations)
- lucide-react (icons)
- nodemailer 8 (email)
- react-hook-form 7 + zod 3 (form validation)
