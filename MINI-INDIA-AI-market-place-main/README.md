# Mini Mart — Enterprise E-Commerce Platform

Premium multi-category storefront + seller portal + admin portal + AI shopping assistant.

## Live MVP stack (this repo runs on)
| Layer     | Tech                                              |
|-----------|---------------------------------------------------|
| Frontend  | React 19, React Router 7, Zustand, Tailwind, ShadCN, Framer Motion, Sonner |
| Backend   | FastAPI (Python 3.11), Motor (async MongoDB)      |
| Database  | MongoDB                                           |
| Auth      | Emergent-managed Google OAuth + JWT session cookies |
| Payments  | Stripe (via adapter pattern → Revolut / Apple Pay / Google Pay pluggable) |
| AI        | OpenAI GPT-4.1 (via Emergent Universal LLM Key) with RAG over product catalogue and streaming responses |

## Reference stack (scaffolded in `/enterprise-scaffold/`)
| Layer          | Tech                                                        |
|----------------|-------------------------------------------------------------|
| Frontend       | Next.js 15 / React 19 / TypeScript (roadmap)                |
| Backend        | Java Spring Boot 3 (Web, Security, Data JPA, OpenAPI)       |
| Database       | PostgreSQL + Redis (cache) + OpenSearch (search)            |
| Infra          | Docker, Kubernetes (Kustomize + Helm), NGINX ingress        |
| CI/CD          | GitHub Actions (build + test + docker push + kubectl apply) |
| Observability  | Prometheus + Grafana + JSON structured logs                 |

## Directory layout
```
/app
├── backend/                # FastAPI live backend
├── frontend/               # React live frontend
├── enterprise-scaffold/    # Production-ready reference
│   ├── java-backend/       # Spring Boot 3 microservice scaffold
│   ├── docker/             # Dockerfiles + docker-compose.yml
│   ├── k8s/                # Kustomize manifests
│   ├── helm/               # Helm chart
│   ├── .github/workflows/  # CI/CD pipelines
│   └── docs/               # Architecture, API, deployment
```

## Key features implemented
- ✅ Homepage with premium bento-grid hero, category tiles, trending products
- ✅ Product catalog with filters (category, brand, price), sort, pagination, search
- ✅ Product detail with image gallery, quantity picker, reviews & ratings, related products
- ✅ Cart + Checkout with Stripe integration and coupon codes
- ✅ Order tracking + order history
- ✅ Wishlist
- ✅ Auth (Google OAuth via Emergent + dev-email fallback), JWT session cookies, RBAC
- ✅ Seller Portal (dashboard KPIs, product CRUD)
- ✅ Admin Portal (users, orders, product approvals, coupons)
- ✅ AI Shopping Assistant "Mira" with streaming RAG over product catalog

## Architecture principles
- **Clean architecture**: routers → services → repositories → models
- **Repository pattern** for MongoDB access
- **API versioning** (`/api/…`, ready for `/api/v2/…`)
- **Adapter pattern** for payments (Stripe today, Revolut/ApplePay/GooglePay tomorrow)
- **RBAC**: customer / seller / admin roles enforced server-side
- **Stateless services** — horizontally scalable behind any LB
- **Cache-ready**: repositories designed for Redis look-aside cache
- **Search-ready**: catalog queries structured for OpenSearch/Elasticsearch migration
- **CDN-ready**: all images served from CDN URLs; frontend build is fully static

## Running locally
Services are supervised — do NOT `uvicorn`/`yarn start` manually.
```bash
sudo supervisorctl status
sudo supervisorctl restart backend
sudo supervisorctl restart frontend
```

## Environment
Backend `.env`:
- `MONGO_URL`, `DB_NAME`, `CORS_ORIGINS`
- `EMERGENT_LLM_KEY` (OpenAI proxy)
- `STRIPE_API_KEY` (test mode preloaded)
- `JWT_SECRET`

Frontend `.env`:
- `REACT_APP_BACKEND_URL`

## API surface (v1)
```
GET    /api/health
GET    /api/categories
GET    /api/brands
GET    /api/products?q=&category=&brand=&sort=&page=&min_price=&max_price=
GET    /api/products/trending
GET    /api/products/search-suggest?q=
GET    /api/products/:id
GET    /api/products/:id/related
GET    /api/products/:id/reviews
POST   /api/products/:id/reviews
POST   /api/auth/session            (Emergent OAuth exchange)
POST   /api/auth/dev-login          (dev fallback)
GET    /api/auth/me
POST   /api/auth/logout
GET    /api/cart, /api/wishlist
POST   /api/cart/add, /api/cart/update, DELETE /api/cart/:pid
POST   /api/wishlist/:pid, DELETE /api/wishlist/:pid
POST   /api/coupons/validate
GET    /api/coupons
POST   /api/checkout/create
GET    /api/checkout/status/:sid
POST   /api/webhook/stripe
GET    /api/orders, GET /api/orders/:oid
POST   /api/chat/stream                 (SSE, RAG-grounded)
GET    /api/chat/history/:session_id
Seller: /api/seller/dashboard, /api/seller/products (CRUD)
Admin:  /api/admin/{stats,users,orders,products/pending,coupons}
```

## Design system
Fonts: Cabinet Grotesk + Satoshi.
Colors: `#0E7A3E` (green), `#FF8C00` (orange), `#1F2937` (charcoal), white.
Layout: floating minimal cards, glassmorphism sticky header, high-density dashboard grids.

## Roadmap → Next.js 15 + Spring Boot 3 (scaffolded)
See `/enterprise-scaffold/docs/` for full migration guide.
