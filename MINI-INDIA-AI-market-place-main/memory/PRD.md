# Mini Mart — Enterprise E-Commerce Platform

## Original Problem Statement
Redesign miniindia.ie into a modern enterprise-grade e-commerce platform inspired by Amazon and Flipkart. User chose **Option C hybrid**: build a fully working MVP on the supported stack (React + FastAPI + MongoDB) while generating enterprise-ready architecture, Docker, Kubernetes, CI/CD, API contracts, and deployment documentation for future migration to the target enterprise stack (Next.js 15 + Java Spring Boot 3 + PostgreSQL + Redis + OpenSearch).

## Design & Brand
- Colors: Dark Green `#0E7A3E`, Orange `#FF8C00`, Charcoal `#1F2937`, White
- Fonts: Cabinet Grotesk (display) + Satoshi (body)
- Aesthetic: Minimal, premium, enterprise-grade
- Responsive: mobile / tablet / desktop

## User Personas
1. **Customer** — browses, searches, filters, adds to cart/wishlist, checks out, reviews, chats with Mira AI.
2. **Seller** — dashboard KPIs, product CRUD, inventory.
3. **Admin** — user role management, order status, product approvals, coupon management, platform stats.

## Core Requirements (Phase 1 — DONE)
| # | Feature                            | Status |
|---|------------------------------------|--------|
| 1 | Homepage (Amazon/Flipkart-inspired) | ✅ |
| 2 | Product catalog (categories, brands, search, filters, sort, pagination) | ✅ |
| 3 | Auth (Google OAuth via Emergent + Email dev-login, JWT cookies) | ✅ |
| 4 | Shopping Cart + Checkout (Stripe test mode) | ✅ |
| 5 | AI Shopping Assistant "Mira" (OpenAI GPT-4.1 via Emergent LLM Key, RAG + streaming) | ✅ |
| 6 | Seller Dashboard (KPIs + Product CRUD) | ✅ |
| 7 | Admin Dashboard (Users, Orders, Approvals, Coupons) | ✅ |
| 8 | Order Management | ✅ |
| 9 | Wishlist + Reviews | ✅ |
| 10 | Coupon Management (WELCOME10, FREESHIP, SAVE5 seeded) | ✅ |

## Implementation Log
- **2026-07-13**: MVP launched, rebranded to Mini India, then **fully synced with the live Mini India catalog** via automated scraping.
  - Backend: FastAPI + Motor MongoDB, 20+ REST endpoints, JWT session cookies, RBAC (customer/seller/admin), Stripe adapter pattern (Revolut/ApplePay/GooglePay pluggable), streaming SSE AI chat with RAG over product catalog.
  - Frontend: React 19, Zustand, Tailwind, ShadCN, Sonner, Phosphor icons; pages Home, Products, ProductDetail, Cart, Checkout, Orders, Wishlist, Login, Seller, Admin; AI Chat Widget with streaming.
  - **Brand alignment**: downloaded the official Mini India logo (`/frontend/public/logo.png`) — used in navbar / hero / footer / login / favicon.
  - **Live catalog scrape**: `/app/scripts/scrape_miniindia.py` (Playwright-based, handles miniindia.ie's JS anti-bot) scrapes all 13 category pages of `https://www.miniindia.ie/menu.php?catid=*` and extracts **980 real products** with real titles, prices, discounts, and CDN image URLs into `/app/backend/miniindia_products.json`.
  - Seed function loads that JSON on startup — 980 products, 13 categories (Bundles, Kitchen, Snacks & Savouries, Rice & Flour, Grocery & Ready Meals, Spices & Masala, Ayurveda/Oil/Ghee, Pooja & Devotional, Chocolates & Sweets, Dates & Indian Sweets, Beverages, Grains & Lentils, Fresh & More), 22 real brands (Haldirams, Bikano, MDH, Everest, Tata, Ashoka, Deep, Heera, Chef's Choice, MTR, Gits, Parle, Nestle, Wagh Bakri, 24 Mantra, Mini India, Priya, Vandevi, Dabur, Himalaya, Patanjali, Chings, Maggi, Binge, Telugu Foods, Kissan, Britannia, Amul, Cadbury + Other).
  - Idempotent seeder: `db.app_meta.seed_marker` — bump `SEED_MARKER` constant to force a fresh reseed.
  - Enterprise scaffold: Spring Boot 3 pom + entities + repository + payment adapter + PostgreSQL Flyway schema (V1__init.sql, 12 tables), Dockerfiles (multi-stage), docker-compose (postgres/redis/opensearch/api/web/nginx/prom/grafana), Kubernetes manifests (Deployment + Service + HPA 3-20 + PDB + Ingress + StatefulSets), Helm chart, GitHub Actions CI/CD.
  - Testing: 39/39 backend tests PASSED before catalog swap; catalog API smoke-tested post-swap (search 'basmati' → 16 real matches, search 'gulab' → Haldirams + Bikaji Gulab Jamun).
  - Backend: FastAPI + Motor MongoDB, 20+ REST endpoints, JWT session cookies, RBAC (customer/seller/admin), Stripe adapter pattern (Revolut/ApplePay/GooglePay pluggable), streaming SSE AI chat with RAG over product catalog.
  - Frontend: React 19, Zustand, Tailwind, ShadCN, Sonner, Phosphor icons; pages Home, Products, ProductDetail, Cart, Checkout, Orders, Wishlist, Login, Seller, Admin; AI Chat Widget with streaming.
  - **Brand & catalog aligned to real Mini India** (`https://www.miniindia.ie/`): downloaded the official Mini India logo (`/frontend/public/logo.png`, used in navbar/hero/footer/login/favicon); replaced fake seed with **24 authentic Mini India products** with real prices and real product image URLs from miniindia.ie:
    - Sweets: Haldirams Gulab Jamun 1kg (€7.29)
    - Snacks: Bikano Chips Salted €1.49, Chatak Masala €0.99, Moong Dal Masala €1.59; Telugu Dal Mothi Mixture €4.39; Binge Quinoa Crispies €2.49
    - Noodles: Chings Singapore Curry €1.00; Maggi Veg Atta €1.00
    - Spices: MDH Garam Masala €3.49, Chana Masala €2.79; Everest Kitchen King €2.99, Turmeric €2.49
    - Grains: Ashoka Basmati Rice 5kg €14.99; Aashirvaad Atta 5kg €9.99; Toor Dal 1kg €4.49; Chana Dal 1kg €3.99
    - Pooja & Devotional (Mini India own-brand): Steel Thali Set €3.99, Sindoor €1.99, Cotton Wicks €1.49, Rudraksha Mala €4.99, Mata Chunri €3.49, Guggal €2.99, Wheat for Pooja €1.49, Sthapan Cloth €1.99
  - **New categories** matching Mini India: Snacks & Namkeen, Sweets & Mithai, Noodles & Instant, Spices & Masala, Rice/Flour/Pulses, Pooja & Devotional.
  - **11 real brands** seeded: Mini India, Haldirams, Bikano, Maggi, Chings, Binge, Telugu Foods, MDH, Everest, Tata, Ashoka.
  - Enterprise scaffold: Spring Boot 3 pom + entities + repository + payment adapter + PostgreSQL Flyway schema (V1__init.sql, 12 tables), Dockerfiles (multi-stage), docker-compose (postgres/redis/opensearch/api/web/nginx/prom/grafana), Kubernetes manifests (Deployment + Service + HPA 3-20 + PDB + Ingress + StatefulSets), Helm chart, GitHub Actions CI/CD.
  - Testing: 39/39 backend tests PASSED. Bug fix: added `loading` flag to `useAuth` store to prevent race redirect on `/checkout` direct navigation.

## Architecture Choices
- **Repository pattern**: MongoDB access isolated in `db.<collection>` async helpers; Java scaffold uses Spring Data JPA.
- **Adapter pattern for payments**: `PaymentAdapter` interface with `StripeAdapter` today; Revolut/ApplePay/GooglePay pluggable.
- **RBAC**: server-side enforced via `require_user`, `require_seller`, `require_admin` dependencies.
- **API versioning**: current `/api/…`, ready to shard as `/api/v2/…`.
- **Horizontal scalability**: stateless FastAPI + stateless Spring services; sessions in DB; HPA 3–20 replicas in K8s.
- **Cache-ready**: MongoDB queries structured for Redis look-aside; Spring `@Cacheable("products")` in scaffold.
- **Search-ready**: catalog queries structured for migration to OpenSearch/Elasticsearch (BM25 + kNN semantic).
- **CDN-ready**: all product images use CDN URLs; static frontend build is deployable to Vercel/Cloudflare/CloudFront.

## Backlog (Phase 2 candidates)
| Priority | Item |
|----------|------|
| P1 | Migrate frontend to Next.js 15 (App Router, RSC, SEO metadata, sitemap) |
| P1 | Migrate backend to Spring Boot 3 microservices with PostgreSQL |
| P1 | Add OpenSearch semantic + fuzzy + voice + image search |
| P1 | Revolut Pay, Apple Pay, Google Pay payment adapters |
| P2 | Multi-language (i18next) + Dark mode toggle |
| P2 | Email OTP + Phone OTP authentication |
| P2 | Recommendation engine (Frequently Bought Together, collaborative filtering) |
| P2 | Real-time order tracking with WebSockets |
| P2 | Human handoff for AI assistant (support ticketing) |
| P2 | Prometheus + Grafana dashboards (JVM metrics, order funnel, latency p95/p99) |
| P3 | Multi-tenant sellers with revenue payouts |
| P3 | Loyalty wallet + Gift cards |
| P3 | AI-powered analytics for admin (churn, LTV, cohort) |

## Known Non-blockers
- Console logs `401 /api/auth/me` on anonymous page loads — cosmetic (auth check is expected to fail for guests).
- Server.py is intentionally a single file for MVP; split into `routers/`, `services/`, `repos/` recommended for Phase 2 to fully realise clean architecture.

## Next Actions
1. Await user feedback on MVP UX
2. Choose next phase priority (migration to Next.js/Spring, or add search/recommendations)
3. Optionally roll out on real staging (docs already in `/app/enterprise-scaffold/docs/deployment.md`)
