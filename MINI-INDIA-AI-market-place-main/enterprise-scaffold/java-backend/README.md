# Spring Boot 3 Backend Scaffold — Mini Mart

Java 21 · Spring Boot 3.3 · Spring Security · Spring Data JPA · PostgreSQL · Redis · OpenSearch

## Modules (Clean Architecture)
```
com.minimart
├── config/       # SecurityConfig, RedisConfig, OpenSearchConfig, OpenApiConfig
├── security/     # JwtAuthenticationFilter, JwtService, OAuth2 handlers
├── domain/       # JPA entities: User, Product, Category, Brand, Order, Cart…
├── repo/         # Spring Data repositories (Repository Pattern)
├── service/      # Business logic (ProductService, OrderService, PaymentService)
├── controller/   # REST controllers under /api/v1/…
└── dto/          # Request/Response DTOs
```

## Build & Run
```bash
./mvnw clean package -DskipTests
docker build -t minimart-api:latest .
docker run -p 8080:8080 --env-file .env minimart-api:latest
```

## Endpoints (mirrors FastAPI live MVP)
See `docs/openapi.yaml` for the full contract. All endpoints under `/api/v1/`.

## Configuration
`application.yml` reads from env vars: `SPRING_DATASOURCE_URL`, `SPRING_REDIS_HOST`,
`OPENSEARCH_URL`, `JWT_SECRET`, `STRIPE_API_KEY`, `OPENAI_API_KEY`.

## Payment adapter (Strategy pattern)
```java
public interface PaymentAdapter {
    CheckoutResponse createCheckout(BigDecimal amount, String currency, String successUrl, String cancelUrl, Map<String,String> metadata);
    PaymentStatus getStatus(String sessionId);
}
// Implementations: StripeAdapter, RevolutAdapter, ApplePayAdapter, GooglePayAdapter
// Selection via @Qualifier or Spring @ConditionalOnProperty
```

## Testing
```bash
./mvnw test              # unit
./mvnw verify            # integration (Testcontainers: Postgres + Redis + OpenSearch)
```

## Migration from FastAPI MVP
1. Export MongoDB → transform to relational schema (`docs/schema.sql`)
2. Load into PostgreSQL
3. Copy JWT / session logic to Spring Security
4. Rewire Stripe adapter (implementation ready in `service/payment/`)
5. Point Next.js frontend `NEXT_PUBLIC_API_URL` at Spring service
