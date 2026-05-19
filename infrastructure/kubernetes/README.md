# MedGuard360 — Kubernetes manifests

Manifests are organized by concern, not by service. The Helm chart in
`chart/` is the recommended deploy path; the raw `.yaml` files in
`base/` and `overlays/` are Kustomize-compatible if you prefer that.

```
infrastructure/kubernetes/
├── base/
│   ├── namespace.yaml         # medguard360 + medguard360-prod namespaces
│   ├── secrets-template.yaml  # ExternalSecret resources (pull from Vault/AWS Secrets Manager)
│   ├── configmaps.yaml        # non-secret config
│   ├── postgres.yaml          # CloudNativePG cluster (HA, replicas, backups)
│   ├── redis.yaml             # Redis Sentinel / Cluster
│   ├── kafka.yaml             # Strimzi Kafka cluster
│   ├── minio.yaml             # MinIO Operator
│   ├── service-deployment.yaml.tmpl   # template applied per service
│   └── ingress.yaml           # external routing
├── overlays/
│   ├── staging/
│   └── production/
└── chart/                      # Helm chart (`helm install medguard360 ./chart`)
```

## Quick start (production)

```bash
# Prereqs:
# - kubernetes cluster (EKS, GKE, AKS, on-prem)
# - cert-manager (TLS via Let's Encrypt or internal CA)
# - external-secrets (Vault / AWS Secrets Manager pull)
# - cloudnative-pg, strimzi, minio operators

kubectl apply -f base/namespace.yaml
kubectl apply -f base/secrets-template.yaml          # binds to your secrets backend
kubectl apply -f base/postgres.yaml                  # CNPG creates the HA cluster
kubectl apply -f base/redis.yaml
kubectl apply -f base/kafka.yaml
kubectl apply -f base/minio.yaml

# Wait for infra to be ready, then deploy services:
helm install medguard360 ./chart \
  --namespace medguard360-prod \
  --values overlays/production/values.yaml
```

## Why no inline-rendered manifests for all 30 services?

Each one would be a 60-line Deployment + Service + ServiceMonitor that
differs only in name and port. The Helm chart loops over a list and
renders them, avoiding 1,800+ lines of nearly-identical YAML. The
template is in `chart/templates/service.yaml`.
