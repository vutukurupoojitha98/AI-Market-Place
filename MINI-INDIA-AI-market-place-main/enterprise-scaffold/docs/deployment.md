# Deployment Guide

## Local (docker-compose)
```bash
cd enterprise-scaffold/docker
cp .env.example .env    # set STRIPE_API_KEY, OPENAI_API_KEY
docker compose up --build
open http://localhost   # NGINX at :80
```

## Kubernetes (Kustomize)
```bash
kubectl create namespace minimart
kubectl apply -k enterprise-scaffold/k8s/base
```

## Kubernetes (Helm)
```bash
helm install minimart enterprise-scaffold/helm/minimart \
  --namespace minimart --create-namespace \
  --set secrets.jwtSecret=$(openssl rand -hex 32) \
  --set secrets.stripeApiKey=$STRIPE_API_KEY \
  --set secrets.openaiApiKey=$OPENAI_API_KEY
```

## AWS EKS (production)
1. `eksctl create cluster --name minimart-prod --region eu-west-1 --nodes 3 --node-type m6i.large --managed`
2. Install AWS Load Balancer Controller, cert-manager, external-secrets, metrics-server.
3. Create RDS PostgreSQL + ElastiCache Redis + OpenSearch Service (managed).
4. `helm install` pointing `postgres.enabled=false`, external DB URL via secret.
5. Point Route53 `minimart.ie` → ALB from ingress.

## CI/CD (GitHub Actions)
On push to `main`: build → test → docker push (GHCR) → `helm upgrade` to prod cluster.

## Rollback
```bash
helm history minimart -n minimart
helm rollback minimart <REVISION> -n minimart
```

## Zero-downtime
- Rolling updates (`maxSurge: 1, maxUnavailable: 0`)
- PodDisruptionBudget `minAvailable: 2`
- Readiness probes on `/actuator/health/readiness`
