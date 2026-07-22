# Architecture Overview

## High-level
```
                          ┌──────────────┐
Users ─── CDN ─── NGINX ──│ Next.js Web  │
              (Ingress)   └──────┬───────┘
                                 │ /api/*
                                 ▼
                         ┌──────────────┐
                         │ Spring Boot  │──── Redis (cache)
                         │  Microsvcs   │──── OpenSearch (search)
                         │  (HPA 3-20)  │──── S3 (media)
                         └──────┬───────┘
                                │
                          PostgreSQL (HA)
```

## Layers (Clean Architecture)
- **Controller** — HTTP boundary (`/api/v1/…`), DTO in/out, validation.
- **Service** — business logic, transactions, calls repositories & external adapters.
- **Repository** — Spring Data JPA + custom queries. Redis cache-aside.
- **Domain** — pure JPA entities, enums, value objects.
- **Adapters** — Payment (Stripe/Revolut/Apple/Google), Search (OpenSearch), Storage (S3).

## Payment Adapter (Strategy)
`PaymentAdapter` interface with implementations: `StripePaymentAdapter`, `RevolutPaymentAdapter`, `ApplePayAdapter`, `GooglePayAdapter`. Selected via `@Qualifier` from `application.yml`.

## Cache
- Redis look-aside on product read paths (`@Cacheable("products")` with TTL 60s).
- ETag on list endpoints. CDN caches immutable assets.

## Search
- OpenSearch index `products` synced via Debezium/CDC or on-write events.
- Fuzzy + semantic (BM25 + kNN with sentence-transformer embeddings).

## AI Assistant
- Emergent `LlmChat` proxying OpenAI GPT-4.1 with streaming SSE.
- RAG: top-6 products fetched from OpenSearch as system context.
- Session-scoped memory in `ai_conversations` table.

## Observability
- Prometheus scrape via `/actuator/prometheus`, JSON logs to stdout → Loki.
- Grafana dashboards: latency (p50/p95/p99), error rate, order funnel.

## Security
- JWT + httpOnly cookies, RBAC (`ROLE_CUSTOMER`, `ROLE_SELLER`, `ROLE_ADMIN`).
- OWASP: SQL via JPA parameterized, XSS via React escaping, CSRF via SameSite=None secure cookies.
- Rate limiting via NGINX + Bucket4j in Spring.
- Secrets via Kubernetes ExternalSecrets → AWS Secrets Manager / Vault.

## Scaling
- Stateless API, HPA 3–20 replicas on CPU 65% + memory 75%.
- PostgreSQL read replicas via `spring.datasource.jdbc-url` routing.
- Redis Cluster for cache; OpenSearch sharded cluster for search.
- CDN (CloudFront / Cloudflare) for static + product images.
