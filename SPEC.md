# Violette Train Website — SPEC.md

> **Last updated:** April 24, 2026
> **Status:** Planning

---

## 1. Overview

**Violette Train** is a luxury tourist train brand operating in Vietnam, inspired by the elegance of violet fields and the richness of Vietnamese heritage. The website serves as the primary digital presence — combining a rich marketing blog (for brand storytelling and SEO) with a functional online ticket booking system.

**Reference sites:** Chapa Express Train, Hanoi Train
**Theme reference:** [violettetrain.lovable.app](https://violettetrain.lovable.app)
**Stack:** Next.js 14+ (App Router) + TypeScript + Tailwind CSS + next-intl

---

## 2. Vision & Personality

### Brand Essence

Violette Train is where **heritage meets luxury**. The website should feel like stepping into a first-class sleeping car — elegant, warm, immersive, and distinctly Vietnamese. It should evoke the romance of overnight train travel while maintaining the polish of a world-class hospitality brand.

### Tone of Voice

- **Warm but refined**: Never cold corporate, never overly casual
- **Vietnamese pride**: Celebrate local culture, landscapes, and communities
- **Luxury without pretension**: Inviting, not intimidating
- **Storytelling-first**: Every page should tell a story

### Design Personality

- Deep violet backgrounds for hero and dark sections
- Gold accents for CTAs and highlights
- Clean, spacious layouts with generous whitespace
- High-quality photography with warm, golden-hour tones
- Subtle animations that feel smooth and luxurious

---

## 3. Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router) | 14+ |
| Language | TypeScript | 5+ (strict mode) |
| Styling | Tailwind CSS + CSS Variables | 3+ |
| i18n | next-intl | 3+ |
| Animations | Framer Motion | 11+ |
| Icons | Lucide React | Latest |
| Forms | React Hook Form + Zod | 7+ / 9+ |
| Payments | VNPay, MoMo | APIs |
| Deployment | Vercel | — |

---

## 4. Site Structure

```
/                           → Home page
/booking                    → Multi-step booking flow
/cabins                     → Cabin class showcase
/cabins/[slug]             → Individual cabin detail
/blog                       → Blog listing
/blog/[slug]               → Blog article
/about                      → About page
/contact                    → Contact page
```

**Locale routing:**
```
/                          → Vietnamese (default)
/en/                       → English
```

---

## 5. Pages & Features

### 5.1 Home Page

**Purpose:** First impression + primary booking entry point + brand storytelling.

**Sections (top to bottom):**

1. **Navbar** — Transparent on hero, solid on scroll. Logo, nav links, language switcher, "Đặt vé" CTA.
2. **Hero** — Full-viewport, cinematic train image, brand tagline, headline, "Khám phá ngay" CTA, scroll indicator.
3. **Booking Widget** — Compact horizontal form: From/To, Date, Passengers, "Tìm vé" button. Appears below hero or in sticky header.
4. **Why Us** — 3-column grid: Pioneer & Unique, Professional Expertise, Sustainability & Innovation.
5. **Cabin Showcase** — Horizontal scroll/grid of 4 cabin class cards with images and starting prices.
6. **Stats** — Animated counters: passengers served, routes, cabin classes.
7. **Trip Inspiration** — Featured blog article + 3 smaller cards.
8. **Testimonials** — Carousel of passenger quotes with photos.
9. **Notice** — Small section about train noise/railway heritage (builds trust).
10. **Footer** — Dark violet. Brand info, navigation, contact, social links, copyright.

### 5.2 Booking Flow (5 Steps)

| Step | Name | Key Features |
|------|------|-------------|
| 1 | Select Route | From/To, one-way/round-trip, date, passengers |
| 2 | Select Cabin | Cabin class cards with pricing, availability |
| 3 | Passenger Info | Form with validation, special requests |
| 4 | Payment | Order summary, payment method, promo code |
| 5 | Confirmation | Success animation, booking ref, email notice |

### 5.3 Cabin Classes

Four cabin tiers displayed with full detail pages:
- **Deluxe (DLX)** — Open carriage, 4 seats
- **VIP** — Private cabin, 2 berths, en-suite
- **Suite** — Spacious private, premium amenities
- **Grand Suite Queen (GSQ)** — Luxury, cultural design, butler service

Each detail page: image gallery, description, amenity grid, pricing table, "Đặt ngay" CTA.

### 5.4 Blog

- Blog listing with category filters and pagination
- 12+ articles for launch covering destinations, tips, culture
- Article pages with rich content, images, share buttons, related posts
- Categories: Travel, Tips & Tricks, Culture, Food, Guest Stories

### 5.5 About Page

Brand story, mission, team, contact information.

### 5.6 Contact Page

Contact form + office locations + phone/email/social links.

---

## 6. Routes

| Route | From | To | Duration | Departures |
|-------|------|----|---------|-----------|
| HN-LC | Hanoi | Lao Cai (Sapa) | ~8h | Daily, 21:00 |
| HN-NB | Hanoi | Ninh Binh | ~2h | Daily, 06:30 / 19:00 |
| HN-DH | Hanoi | Dong Hoi (Phong Nha) | ~6h | Thu, Sat, Sun |
| HN-H | Hanoi | Hue | ~12h | Daily, 19:00 |
| HN-DN | Hanoi | Da Nang | ~17h | Daily, 19:30 |

---

## 7. Pricing Model

```
Final Price = Route Base × Cabin Factor × Season Factor × Passenger Type
```

- Round trip: 5% discount
- Tax: 10%
- Season factors: Low (0.85), Regular (1.0), Peak (1.4 — Tết, December)

---

## 8. Payment Methods

| Method | Status |
|--------|--------|
| VNPay QR | Primary |
| MoMo QR | Secondary |
| Credit Card | Optional |
| Bank Transfer | Optional |

---

## 9. Design Language

### Colors
- Primary: Violet-600 to Violet-950 (deep purple gradient)
- Accent: Gold-500 (#D4AF37)
- Background: White, Gray-50, Violet-50, Violet-950
- Text: Gray-900 (primary), Gray-500 (secondary)

### Typography
- **Headings:** Playfair Display (serif) — editorial elegance
- **Body:** DM Sans — clean readability
- **Accent/Quotes:** Cormorant Garamond — refined luxury

### Motion
- Smooth, long-easing transitions (300-600ms)
- Fade-up reveals on scroll
- Scale-on-hover for cards
- No bouncy or playful animations

---

## 10. Skills Reference

All implementation guidance lives in Cursor skills at `.cursor/skills/`:

| Skill | Purpose |
|-------|---------|
| `violette-design-system` | Design tokens, colors, typography, motion |
| `violette-project-init` | Next.js scaffolding, folder structure, config |
| `violette-i18n` | Bilingual VI/EN with next-intl |
| `violette-components` | All UI components and page sections |
| `violette-ticket-system` | Routes, cabins, pricing, booking flow |
| `violette-payment` | VNPay/MoMo integration |
| `violette-blog` | Marketing content strategy and articles |
| `violette-deployment` | Vercel deployment, CI/CD, monitoring |

---

## 11. Phase Plan

### Phase 1: Foundation
- [ ] Initialize Next.js project
- [ ] Configure Tailwind with design system
- [ ] Set up next-intl (VI + EN)
- [ ] Build Navbar and Footer
- [ ] Set up public folder with placeholder images

### Phase 2: Home Page
- [ ] Hero section
- [ ] Booking widget
- [ ] Why Us section
- [ ] Cabin showcase
- [ ] Stats section
- [ ] Trip Inspiration (static data)
- [ ] Testimonials (static data)
- [ ] Footer

### Phase 3: Cabin Pages
- [ ] Cabin listing page
- [ ] Individual cabin detail pages
- [ ] Cabin comparison table

### Phase 4: Booking Flow
- [ ] Step 1: Route selection
- [ ] Step 2: Cabin selection
- [ ] Step 3: Passenger info form
- [ ] Step 4: Payment
- [ ] Step 5: Confirmation
- [ ] Booking summary sidebar

### Phase 5: Blog
- [ ] Blog listing page
- [ ] Individual article pages (MDX)
- [ ] 12 initial articles
- [ ] Category filtering

### Phase 6: Additional Pages
- [ ] About page
- [ ] Contact page with form

### Phase 7: Payment Integration
- [ ] VNPay integration
- [ ] MoMo integration
- [ ] Payment confirmation flow
- [ ] Email notifications

### Phase 8: Polish & Launch
- [ ] Responsive testing
- [ ] Performance optimization
- [ ] SEO setup
- [ ] Analytics integration
- [ ] Deploy to Vercel
- [ ] Domain configuration

---

## 12. Out of Scope (MVP)

- Mobile native app
- Loyalty/reward program
- Multi-language beyond VI/EN
- Seat map (visual layout)
- Real-time availability (use static for MVP)
- Admin dashboard (booking management)
- Real payment gateway until Phase 7
