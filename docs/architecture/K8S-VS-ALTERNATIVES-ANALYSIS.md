# Kubernetes vs Alternatives: Deployment Architecture Analysis

**Project**: pdf-summarize  
**Repository**: https://github.com/abezr/pdf-summarize  
**Date**: 2025-11-30  
**Version**: 1.0.0

---

## Executive Summary

### TL;DR: Is Kubernetes Worth It?

**SHORT ANSWER**: **NO, not initially. Start with Docker Compose. Consider K8s only after proven scale.**

**DECISION MATRIX**:

| Scenario | Recommended Deployment | Why |
|----------|----------------------|-----|
| **Side Project / MVP** | Docker Compose | Simple, fast, sufficient for 100s of docs/day |
| **Small Team (<10 users)** | Docker Compose | Over-engineering K8s wastes time |
| **Moderate Scale (1K-10K docs/day)** | Managed Service (Cloud Run, ECS Fargate) | Auto-scaling without K8s complexity |
| **Large Scale (>10K docs/day)** | Kubernetes (GKE/EKS) | Justified when multi-service orchestration needed |
| **Multi-Region / High Availability** | Kubernetes | Built-in features for geographic distribution |
| **Learning / Portfolio Project** | Kubernetes (Minikube locally) | Educational value, but not production-ready |

---

## Table of Contents

1. [Project Context: What Are We Deploying?](#project-context)
2. [Deployment Options Comparison](#deployment-options)
3. [Kubernetes: Deep Dive](#kubernetes-deep-dive)
4. [Docker Compose: Recommended Starting Point](#docker-compose)
5. [Managed Services: Middle Ground](#managed-services)
6. [Cost Analysis](#cost-analysis)
7. [Migration Path](#migration-path)
8. [Final Recommendation](#final-recommendation)

---

## 1. Project Context: What Are We Deploying? {#project-context}

### System Architecture (C4 Level 2)

```
┌─────────────────────────────────────────────────────────────────────┐
│                      PDF SUMMARY AI SYSTEM                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐        │
│  │   Frontend   │    │  API Gateway │    │  Doc Process │        │
│  │  (React SPA) │◄───┤ (Node.js)    │◄───┤  Service     │        │
│  │              │    │              │    │  (Node.js)   │        │
│  └──────────────┘    └──────────────┘    └──────────────┘        │
│                           │                     │                  │
│                           │                     │                  │
│                           ▼                     ▼                  │
│                    ┌─────────────────────────────────┐            │
│                    │   Data & Cache Layer            │            │
│                    │  - PostgreSQL (metadata)        │            │
│                    │  - Redis (graph cache)          │            │
│                    │  - S3/GCS (PDF storage)         │            │
│                    └─────────────────────────────────┘            │
│                                                                     │
│                    ┌─────────────────────────────────┐            │
│                    │   Observability Stack           │            │
│                    │  - Prometheus (metrics)         │            │
│                    │  - Grafana (dashboards)         │            │
│                    │  - Jaeger (tracing)             │            │
│                    └─────────────────────────────────┘            │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
         │                                        │
         │                                        │
         ▼                                        ▼
  ┌─────────────┐                        ┌─────────────┐
  │ OpenAI API  │                        │ Google AI   │
  │ (GPT-4o)    │                        │ (Gemini)    │
  └─────────────┘                        └─────────────┘
```

### Key Characteristics

| Aspect | Details | Implications for Deployment |
|--------|---------|----------------------------|
| **Compute Profile** | CPU-intensive (graph building, semantic processing) | Need CPU-optimized instances, not GPU |
| **Memory** | Moderate (2-4GB per worker for 50MB PDFs) | Predictable, not memory-intensive |
| **I/O Pattern** | Bursty (upload → process → idle) | Auto-scaling important, not steady load |
| **State** | Mostly stateless (process layer), stateful DBs | Easy to scale horizontally |
| **External Dependencies** | OpenAI API, Google AI API (rate-limited) | Network reliability critical, retry logic needed |
| **Processing Time** | 15-60s per document (95% LLM wait time) | Long-running requests, need timeout handling |
| **Scale Estimate** | MVP: 10-100 docs/day, Growth: 1K-10K docs/day | Modest scale, not Netflix-level |

### Components to Deploy

| Component | Type | Criticality | Scaling Needs |
|-----------|------|-------------|---------------|
| **API Gateway** | Stateless HTTP service | HIGH (entry point) | Horizontal (2-10 replicas) |
| **Document Processor** | Stateless worker | HIGH (core logic) | Horizontal (5-50 workers) |
| **PostgreSQL** | Stateful database | HIGH (metadata) | Vertical (single instance, read replicas later) |
| **Redis** | Stateful cache | MEDIUM (performance) | Vertical (single instance, cluster later) |
| **Prometheus** | Stateful metrics | MEDIUM (observability) | Vertical (single instance) |
| **Grafana** | Stateless dashboard | LOW (monitoring UI) | Single instance (no scaling needed) |
| **Jaeger** | Stateful tracing | LOW (debugging) | Single instance (can disable in prod) |

---

## 2. Deployment Options Comparison {#deployment-options}

### Option 1: Docker Compose (Recommended for MVP)

**Architecture**:
```yaml
# docker-compose.yml (simplified)
services:
  api-gateway:
    image: pdf-summary/api:latest
    ports: ["8080:8080"]
    replicas: 2
    depends_on: [postgres, redis]
  
  doc-processor:
    image: pdf-summary/worker:latest
    replicas: 5
    depends_on: [postgres, redis]
  
  postgres:
    image: postgres:15
    volumes: [./data/postgres:/var/lib/postgresql/data]
  
  redis:
    image: redis:7-alpine
    volumes: [./data/redis:/data]
  
  prometheus:
    image: prom/prometheus:latest
    volumes: [./config/prometheus.yml:/etc/prometheus/prometheus.yml]
  
  grafana:
    image: grafana/grafana:latest
    volumes: [./config/grafana:/etc/grafana]
```

**Pros**:
- ✅ **Simple**: Single `docker-compose.yml` file, 5-minute setup
- ✅ **Fast iteration**: `docker-compose up` to run, `down` to stop
- ✅ **Low overhead**: No cluster management, no K8s abstractions
- ✅ **Cost-effective**: 1-2 VMs ($20-100/month) vs K8s cluster ($100-500/month)
- ✅ **Sufficient for scale**: Can handle 1K-5K docs/day easily
- ✅ **Good for dev/test**: Identical local and prod environments

**Cons**:
- ❌ **Manual scaling**: Need to SSH and adjust `replicas:` manually
- ❌ **Single-host**: Limited by one VM's resources (though can use Docker Swarm for multi-host)
- ❌ **No auto-healing**: If a container crashes, manual restart (unless using Docker Swarm)
- ❌ **Basic load balancing**: Nginx/Traefik needed for advanced routing
- ❌ **No rolling updates**: Blue-green deployments require scripting

**Best For**:
- MVPs, side projects, small teams (<10 users)
- Predictable, moderate load (up to 5K docs/day)
- Budget-conscious deployments

---

### Option 2: Managed Container Services (Cloud Run, ECS Fargate, App Engine)

**Architecture** (Google Cloud Run example):
```yaml
# cloudrun-service.yaml (API Gateway)
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: pdf-summary-api
spec:
  template:
    spec:
      containers:
      - image: gcr.io/my-project/api:latest
        resources:
          limits:
            memory: 2Gi
            cpu: 2
      scaling:
        minScale: 0
        maxScale: 100
```

**Pros**:
- ✅ **Auto-scaling**: Scale to zero (cost-saving), scale up to 100s of instances automatically
- ✅ **Serverless experience**: No VM management, pay-per-use
- ✅ **Built-in load balancing**: Global load balancer, CDN integration
- ✅ **Easy deployments**: `gcloud run deploy` (or AWS equivalent)
- ✅ **Good observability**: Native integration with Cloud Logging/Monitoring
- ✅ **Less complexity than K8s**: But more features than Docker Compose

**Cons**:
- ❌ **Vendor lock-in**: Harder to migrate between clouds
- ❌ **Cold start latency**: 1-5s delay if scaled to zero (not ideal for real-time)
- ❌ **Request timeout limits**: Cloud Run: 60min max (sufficient for our 60s processing)
- ❌ **Limited customization**: Can't run custom sidecar containers (e.g., Jaeger agent)
- ❌ **Cost at scale**: More expensive than raw VMs at high sustained load

**Best For**:
- Startups with variable traffic (0-10K docs/day)
- Teams wanting managed infra without K8s complexity
- Cloud-native projects (GCP, AWS, Azure)

**Specific Options**:
| Service | Provider | Best Use Case | Cost (estimate) |
|---------|----------|---------------|-----------------|
| **Cloud Run** | Google Cloud | Stateless HTTP services, bursty traffic | $0.10-0.50 per 1K docs |
| **ECS Fargate** | AWS | AWS-native, need ECS ecosystem | $0.15-0.60 per 1K docs |
| **App Engine Flex** | Google Cloud | Python/Node.js apps, simple deployments | $0.20-0.70 per 1K docs |
| **Azure Container Instances** | Microsoft Azure | Azure-native, simple containers | $0.12-0.55 per 1K docs |

---

### Option 3: Kubernetes (GKE, EKS, AKS)

**Architecture** (simplified K8s manifests):
```yaml
# api-gateway-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api-gateway
  template:
    metadata:
      labels:
        app: api-gateway
    spec:
      containers:
      - name: api
        image: gcr.io/my-project/api:latest
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: api-gateway
spec:
  type: LoadBalancer
  selector:
    app: api-gateway
  ports:
  - port: 80
    targetPort: 8080
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-gateway-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-gateway
  minReplicas: 2
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

**Pros**:
- ✅ **Industry standard**: Portable across clouds (AWS, GCP, Azure, on-prem)
- ✅ **Auto-scaling**: Horizontal Pod Autoscaler (HPA), Vertical Pod Autoscaler (VPA)
- ✅ **Self-healing**: Automatic restarts, health checks, rolling updates
- ✅ **Advanced networking**: Service mesh (Istio), ingress controllers, network policies
- ✅ **Rich ecosystem**: Helm charts, operators, Prometheus integration
- ✅ **Multi-tenancy**: Namespaces, RBAC, resource quotas
- ✅ **Declarative config**: GitOps-friendly (ArgoCD, FluxCD)

**Cons**:
- ❌ **Complexity**: Steep learning curve (Deployments, Services, Ingress, ConfigMaps, Secrets, etc.)
- ❌ **Operational overhead**: Need to manage cluster upgrades, node scaling, networking
- ❌ **Cost**: Control plane + worker nodes ($100-500/month minimum for small cluster)
- ❌ **Over-engineering**: Most features unnecessary for small-scale projects
- ❌ **Debugging difficulty**: Logs scattered across pods, networking issues complex
- ❌ **Time investment**: 2-4 weeks to set up properly (vs 1 day for Docker Compose)

**Best For**:
- Large-scale production (>10K docs/day)
- Multi-service microarchitectures (>10 services)
- Teams with K8s expertise
- Multi-cloud or hybrid cloud requirements
- Organizations needing compliance/governance (RBAC, auditing)

**Cost Breakdown** (Google GKE example):
| Component | Cost (per month) |
|-----------|------------------|
| Control plane | $75 (GKE standard) |
| Worker nodes (3x n1-standard-4) | $300 (8 vCPU, 30GB RAM total) |
| Load balancer | $20 |
| Persistent disks (500GB) | $85 |
| **Total** | **$480/month** |

---

### Option 4: Docker Swarm (Underrated Middle Ground)

**Architecture**:
```yaml
# docker-compose.yml (Swarm mode)
version: '3.8'
services:
  api-gateway:
    image: pdf-summary/api:latest
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 10s
      restart_policy:
        condition: on-failure
      resources:
        limits:
          cpus: '1'
          memory: 1G
    ports:
      - "8080:8080"
    networks:
      - app-network

  doc-processor:
    image: pdf-summary/worker:latest
    deploy:
      replicas: 10
      placement:
        constraints:
          - node.role == worker
    networks:
      - app-network

networks:
  app-network:
    driver: overlay
```

**Pros**:
- ✅ **Familiar syntax**: Same `docker-compose.yml` format
- ✅ **Multi-host**: Span across multiple VMs (unlike standalone Docker Compose)
- ✅ **Built-in orchestration**: Auto-healing, rolling updates, load balancing
- ✅ **Simple**: Easier than K8s (no YAML explosion)
- ✅ **Cost-effective**: No control plane costs, just VM costs

**Cons**:
- ❌ **Less popular**: Smaller community, fewer resources
- ❌ **Limited ecosystem**: No equivalent to Helm, Operators
- ❌ **Weaker auto-scaling**: No built-in HPA (need custom scripts)
- ❌ **Uncertain future**: Docker, Inc. focus shifted to Docker Desktop

**Best For**:
- Teams already using Docker Compose wanting multi-host orchestration
- Projects needing more than 1 VM but less than full K8s
- Budget-conscious deployments with moderate scale

---

## 3. Kubernetes: Deep Dive {#kubernetes-deep-dive}

### When Kubernetes Makes Sense

Kubernetes is **JUSTIFIED** when you have **3+ of these**:

1. ✅ **High scale**: >10K requests/day, need 20+ containers
2. ✅ **Multiple services**: 10+ microservices with complex inter-service communication
3. ✅ **Auto-scaling critical**: Traffic spikes 10x within minutes
4. ✅ **Multi-region**: Deploy across US, EU, Asia for latency
5. ✅ **Team expertise**: Engineers already know K8s
6. ✅ **Long-term investment**: Project expected to run for 3+ years
7. ✅ **Compliance/governance**: Need RBAC, audit logs, network policies

### Our Project Score: **2 / 7** ❌

| Criteria | Score | Reasoning |
|----------|-------|-----------|
| High scale | ❌ NO | MVP: 10-100 docs/day, Growth: 1K-5K docs/day (moderate, not high) |
| Multiple services | ⚠️ PARTIAL | 2 main services (API + Worker) + 3 data stores (Postgres, Redis, S3) = 5 components (not 10+) |
| Auto-scaling critical | ⚠️ PARTIAL | Bursty traffic, but not 10x spikes (more like 2-3x) |
| Multi-region | ❌ NO | Single region sufficient initially |
| Team expertise | ❌ NO | Assuming small team, no K8s experts |
| Long-term | ✅ YES | Expected to run for years |
| Compliance | ❌ NO | No strict regulatory requirements |

**Conclusion**: Kubernetes is **over-engineering** for this project at MVP stage.

---

### Kubernetes Complexity: What You're Signing Up For

#### Learning Curve (200+ hours to proficiency)

**Core Concepts** (40 hours):
- Pods, Deployments, ReplicaSets, Services
- ConfigMaps, Secrets, Volumes (PV, PVC)
- Namespaces, Labels, Selectors
- Ingress, Network Policies

**Advanced Topics** (80 hours):
- Helm (package manager), Kustomize (config management)
- StatefulSets (for databases), DaemonSets (per-node services)
- Horizontal Pod Autoscaler (HPA), Vertical Pod Autoscaler (VPA)
- Service Mesh (Istio, Linkerd)
- Operators, Custom Resource Definitions (CRDs)

**Operations** (80 hours):
- Cluster upgrades, node management
- Monitoring (Prometheus + Grafana + K8s metrics)
- Logging (Fluentd/Fluent Bit + ELK/Loki)
- Debugging (kubectl, k9s, kubectx/kubens, stern)
- Security (RBAC, Pod Security Policies, Network Policies)
- CI/CD (ArgoCD, FluxCD, Tekton)

#### Manifest Explosion

**Docker Compose** (1 file, 100 lines):
```yaml
# docker-compose.yml
services:
  api: { image: api:latest, ports: ["8080:8080"], replicas: 2 }
  worker: { image: worker:latest, replicas: 5 }
  postgres: { image: postgres:15 }
```

**Kubernetes** (10+ files, 500+ lines):
```
manifests/
├── namespace.yaml
├── api-gateway/
│   ├── deployment.yaml          (50 lines)
│   ├── service.yaml              (20 lines)
│   ├── hpa.yaml                  (20 lines)
│   ├── ingress.yaml              (30 lines)
│   └── configmap.yaml            (15 lines)
├── doc-processor/
│   ├── deployment.yaml           (50 lines)
│   ├── service.yaml              (20 lines)
│   ├── hpa.yaml                  (20 lines)
│   └── configmap.yaml            (15 lines)
├── postgres/
│   ├── statefulset.yaml          (80 lines)
│   ├── service.yaml              (20 lines)
│   ├── pvc.yaml                  (20 lines)
│   └── secret.yaml               (10 lines)
├── redis/
│   ├── deployment.yaml           (40 lines)
│   ├── service.yaml              (15 lines)
│   └── pvc.yaml                  (15 lines)
├── prometheus/
│   ├── deployment.yaml           (50 lines)
│   ├── service.yaml              (20 lines)
│   ├── configmap.yaml            (100 lines - prometheus.yml)
│   └── servicemonitor.yaml       (30 lines)
└── grafana/
    ├── deployment.yaml           (40 lines)
    ├── service.yaml              (15 lines)
    └── configmap.yaml            (50 lines - dashboards)
```

**Total**: ~750 lines of YAML across 25+ files (vs 100 lines in Docker Compose)

#### Operational Burden

**Daily/Weekly Tasks**:
- Monitor cluster health (`kubectl get nodes`, check Grafana)
- Investigate pod crashes (`kubectl logs`, `kubectl describe pod`)
- Scale services (`kubectl scale deployment/api --replicas=5`)
- Update configurations (`kubectl apply -f updated-config.yaml`)
- Check resource usage (`kubectl top nodes`, `kubectl top pods`)

**Monthly Tasks**:
- Cluster upgrades (e.g., GKE: 1.27 → 1.28)
- Node pool scaling (add/remove nodes based on demand)
- Cost optimization (right-size pods, use spot instances)
- Security patches (update container images)

**Quarterly Tasks**:
- Review RBAC policies, network policies
- Audit logs for security incidents
- Performance tuning (HPA thresholds, resource limits)

**Estimated Time**: 5-10 hours/week for small cluster (vs 1-2 hours for Docker Compose)

---

### Kubernetes Benefits (Are They Worth It?)

| Benefit | Docker Compose Alternative | Verdict |
|---------|---------------------------|---------|
| **Auto-scaling** | Manual `docker-compose up --scale worker=10` | K8s better, but Cloud Run/Fargate also auto-scale |
| **Self-healing** | Docker Swarm has restart policies | K8s better, but Swarm 80% there |
| **Rolling updates** | Blue-green with 2 compose files | K8s smoother, but Swarm achievable |
| **Load balancing** | Nginx/Traefik in front | K8s built-in, but Nginx config is simple |
| **Multi-cloud** | Docker runs anywhere | K8s more portable, but most stay on 1 cloud anyway |
| **Rich ecosystem** | Community Docker images | K8s Helm charts vast, but most use 5-10 common ones |
| **Enterprise features** | Not critical for small projects | K8s overkill unless enterprise |

**Conclusion**: K8s benefits are **real but incremental** for our scale. Marginal value vs large complexity cost.

---

## 4. Docker Compose: Recommended Starting Point {#docker-compose}

### Why Docker Compose Wins for MVP

#### 1. Speed to Market

**Docker Compose Setup Time**: 4-8 hours
- Write `docker-compose.yml` (2 hours)
- Configure Nginx for load balancing (1 hour)
- Set up CI/CD (GitHub Actions to deploy) (2 hours)
- Test locally + deploy to VM (1-2 hours)
- **Total**: ~1 day

**Kubernetes Setup Time**: 40-80 hours (1-2 weeks)
- Learn K8s basics (if new) (20 hours)
- Write 25+ YAML manifests (10 hours)
- Set up GKE/EKS cluster (5 hours)
- Configure Ingress, Helm, monitoring (10 hours)
- Debug networking issues (10 hours)
- Set up CI/CD (ArgoCD/FluxCD) (10 hours)
- **Total**: ~2 weeks

**ROI Analysis**: Spending 2 weeks on K8s delays MVP by 2 weeks. For a side project, that's a 20-50% delay in getting to market. **Opportunity cost is HIGH**.

---

#### 2. Cost Comparison (MVP Scale: 100 docs/day)

**Docker Compose Stack**:
| Component | Resource | Cost (per month) |
|-----------|----------|------------------|
| Single VM (4 vCPU, 16GB RAM) | DigitalOcean, Hetzner, Linode | $40-80 |
| Managed PostgreSQL (if not self-hosted) | Optional | $15-30 |
| S3 storage (100GB) | AWS, GCS | $2-5 |
| Load balancer (if needed) | Optional | $10-20 |
| **Total** | | **$40-135/month** |

**Kubernetes (GKE Standard)**:
| Component | Resource | Cost (per month) |
|-----------|----------|------------------|
| GKE control plane | 1 zonal cluster | $75 |
| Worker nodes (3x e2-standard-2) | 2 vCPU, 8GB RAM each | $150 |
| Load balancer | Cloud Load Balancing | $20 |
| Persistent disks (200GB) | SSD | $35 |
| **Total** | | **$280/month** |

**Savings**: $145-240/month (or $1,740-2,880/year) by using Docker Compose.

---

#### 3. Sufficient Scale Handling

**Single-VM Docker Compose Capacity** (4 vCPU, 16GB RAM):
- **API Gateway**: 2 containers × 500 req/min = 1,000 req/min
- **Document Processor**: 10 workers × 6 docs/hour = 60 docs/hour = **1,440 docs/day**
- **Database**: PostgreSQL handles 10K+ docs metadata easily
- **Redis**: 100MB cache for 500 graphs

**Bottleneck**: LLM API rate limits (OpenAI: 500 req/min, Gemini: 1,500 req/day free tier)

**Conclusion**: Docker Compose can handle **1K-5K docs/day** before needing to scale to multiple VMs.

---

#### 4. Production-Grade Docker Compose

**Enhanced `docker-compose.yml`**:
```yaml
version: '3.8'

services:
  api-gateway:
    image: ${REGISTRY}/api:${VERSION}
    restart: unless-stopped
    environment:
      NODE_ENV: production
      DATABASE_URL: postgres://user:pass@postgres:5432/pdfdb
      REDIS_URL: redis://redis:6379
    ports:
      - "8080:8080"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '1'
          memory: 1G
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started

  doc-processor:
    image: ${REGISTRY}/worker:${VERSION}
    restart: unless-stopped
    environment:
      NODE_ENV: production
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      GOOGLE_AI_API_KEY: ${GOOGLE_AI_API_KEY}
    deploy:
      replicas: 10
      resources:
        limits:
          cpus: '2'
          memory: 2G
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:15-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: pdfdb
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    command: redis-server --appendonly yes
    volumes:
      - redis-data:/data

  prometheus:
    image: prom/prometheus:latest
    restart: unless-stopped
    volumes:
      - ./config/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.retention.time=30d'
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana:latest
    restart: unless-stopped
    environment:
      GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_PASSWORD}
    volumes:
      - grafana-data:/var/lib/grafana
      - ./config/grafana/dashboards:/etc/grafana/provisioning/dashboards
    ports:
      - "3000:3000"

  nginx:
    image: nginx:alpine
    restart: unless-stopped
    volumes:
      - ./config/nginx.conf:/etc/nginx/nginx.conf
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - api-gateway

volumes:
  postgres-data:
  redis-data:
  prometheus-data:
  grafana-data:
```

**Key Production Features**:
- ✅ Health checks for all services
- ✅ Restart policies (`unless-stopped`)
- ✅ Resource limits (CPU, memory)
- ✅ Persistent volumes for data
- ✅ Logging configuration
- ✅ Environment variable management
- ✅ Nginx reverse proxy for HTTPS

---

#### 5. Scaling Path with Docker Compose

**Phase 1: Single VM** (0-1K docs/day)
- 1 VM, Docker Compose, all services on one host
- Cost: $40-80/month

**Phase 2: Vertical Scaling** (1K-3K docs/day)
- Upgrade VM to 8 vCPU, 32GB RAM
- Increase `replicas:` in compose file
- Cost: $80-160/month

**Phase 3: Horizontal Scaling** (3K-10K docs/day)
- **Option A**: Docker Swarm (3-5 VMs)
  - Span services across multiple hosts
  - Built-in load balancing
  - Cost: $120-400/month
- **Option B**: Migrate to managed service (Cloud Run, ECS Fargate)
  - Auto-scaling, no VM management
  - Cost: $200-500/month

**Phase 4: Kubernetes** (>10K docs/day)
- At this point, K8s complexity is justified
- Cost: $500-2,000/month

---

## 5. Managed Services: Middle Ground {#managed-services}

### Google Cloud Run (Recommended Managed Option)

#### Architecture

```
User Request
   │
   ▼
┌──────────────────────────────┐
│ Cloud Load Balancer (HTTPS)  │
└──────────────────────────────┘
   │
   ├────────────────┬────────────────┐
   ▼                ▼                ▼
┌─────────┐    ┌─────────┐    ┌─────────┐
│ API Pod │    │ API Pod │    │ API Pod │  (Auto-scaled 0-100)
└─────────┘    └─────────┘    └─────────┘
   │
   │ (Pub/Sub or Task Queue)
   │
   ▼
┌──────────┐  ┌──────────┐  ┌──────────┐
│ Worker 1 │  │ Worker 2 │  │ Worker N │  (Auto-scaled 0-50)
└──────────┘  └──────────┘  └──────────┘
   │
   ▼
┌─────────────────────────────────┐
│ Cloud SQL (Postgres) + Redis    │
└─────────────────────────────────┘
```

#### Deployment

**API Gateway** (`api.yaml`):
```yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: pdf-summary-api
  labels:
    cloud.googleapis.com/location: us-central1
spec:
  template:
    metadata:
      annotations:
        autoscaling.knative.dev/minScale: "1"
        autoscaling.knative.dev/maxScale: "100"
        autoscaling.knative.dev/target: "80"  # 80% CPU target
    spec:
      containerConcurrency: 80
      timeoutSeconds: 300
      containers:
      - image: gcr.io/my-project/api:latest
        ports:
        - containerPort: 8080
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: url
        resources:
          limits:
            memory: 2Gi
            cpu: 2000m
```

**Document Processor** (`worker.yaml`):
```yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: pdf-summary-worker
spec:
  template:
    metadata:
      annotations:
        autoscaling.knative.dev/minScale: "0"  # Scale to zero when idle
        autoscaling.knative.dev/maxScale: "50"
    spec:
      timeoutSeconds: 600  # 10 min for long processing
      containers:
      - image: gcr.io/my-project/worker:latest
        env:
        - name: OPENAI_API_KEY
          valueFrom:
            secretKeyRef:
              name: llm-keys
              key: openai
        resources:
          limits:
            memory: 4Gi
            cpu: 2000m
```

**Deploy Command**:
```bash
gcloud run deploy pdf-summary-api \
  --image gcr.io/my-project/api:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --min-instances 1 \
  --max-instances 100 \
  --memory 2Gi \
  --cpu 2 \
  --timeout 300s \
  --set-env-vars DATABASE_URL=postgres://... \
  --set-secrets OPENAI_API_KEY=openai-key:latest
```

#### Cost Estimate (1K docs/day)

**Cloud Run Pricing**:
- CPU: $0.00002400 per vCPU-second
- Memory: $0.00000250 per GB-second
- Requests: $0.40 per 1M requests

**Monthly Cost**:
```
Assumptions:
- 1,000 docs/day = 30,000 docs/month = 30,000 requests
- Avg processing time: 30s per doc (mostly LLM wait)
- 2 vCPU, 2GB RAM per request

CPU Cost:
  30,000 requests × 30s × 2 vCPU × $0.00002400 = $43.20

Memory Cost:
  30,000 requests × 30s × 2GB × $0.00000250 = $4.50

Request Cost:
  30,000 requests × ($0.40 / 1M) = $0.01

Cloud SQL (db-f1-micro):
  $25/month (1 vCPU, 3.75GB RAM)

Redis (Memorystore, 1GB):
  $30/month

TOTAL: $102.71/month
```

**Comparison**:
- Docker Compose (single VM): $40-80/month ✅ Cheaper
- Cloud Run: $100/month ✅ Comparable, but auto-scales
- Kubernetes (GKE): $280/month ❌ 3x more expensive

---

### When to Choose Cloud Run Over Docker Compose

| Factor | Docker Compose | Cloud Run | Winner |
|--------|---------------|-----------|--------|
| **Setup complexity** | Low (1 day) | Low (1 day) | **Tie** |
| **Auto-scaling** | Manual | Automatic (0-100 instances) | **Cloud Run** |
| **Cost (MVP scale)** | $40-80 | $100 | **Docker Compose** |
| **Cost (high scale)** | $200-400 (multi-VM) | $200-500 (auto-optimized) | **Tie** |
| **Maintenance** | Medium (VM patching, Docker updates) | Low (fully managed) | **Cloud Run** |
| **Flexibility** | High (run any container) | Medium (HTTP/gRPC only) | **Docker Compose** |
| **Observability** | Manual setup (Prometheus) | Built-in (Cloud Monitoring) | **Cloud Run** |
| **Cold starts** | N/A (always running) | 1-5s delay if scaled to zero | **Docker Compose** |
| **Vendor lock-in** | None (portable) | High (GCP-specific) | **Docker Compose** |

**Verdict**: 
- **Choose Docker Compose** if: Budget-conscious, want portability, predictable steady load
- **Choose Cloud Run** if: Want zero-ops, bursty traffic, cloud-native mindset

---

## 6. Cost Analysis {#cost-analysis}

### 3-Year Total Cost of Ownership (TCO)

**Scenario**: Start at 100 docs/day, grow to 5K docs/day over 3 years

#### Option 1: Docker Compose (Recommended)

| Year | Scale | Infrastructure | Engineer Time (20%) | Total |
|------|-------|----------------|---------------------|-------|
| Year 1 | 100-500 docs/day | $80/mo × 12 = $960 | $20K (0.2 FTE) | **$20,960** |
| Year 2 | 500-2K docs/day | $160/mo × 12 = $1,920 | $20K | **$21,920** |
| Year 3 | 2K-5K docs/day | $400/mo × 12 = $4,800 | $25K (0.25 FTE, multi-VM) | **$29,800** |
| **TOTAL** | | **$7,680** | **$65K** | **$72,680** |

#### Option 2: Cloud Run

| Year | Scale | Infrastructure | Engineer Time (10%) | Total |
|------|-------|----------------|---------------------|-------|
| Year 1 | 100-500 docs/day | $100/mo × 12 = $1,200 | $10K (0.1 FTE) | **$11,200** |
| Year 2 | 500-2K docs/day | $300/mo × 12 = $3,600 | $10K | **$13,600** |
| Year 3 | 2K-5K docs/day | $800/mo × 12 = $9,600 | $12K (0.12 FTE) | **$21,600** |
| **TOTAL** | | **$14,400** | **$32K** | **$46,400** |

#### Option 3: Kubernetes (GKE)

| Year | Scale | Infrastructure | Engineer Time (40%) | Total |
|------|-------|----------------|---------------------|-------|
| Year 1 | 100-500 docs/day | $400/mo × 12 = $4,800 | $40K (0.4 FTE) | **$44,800** |
| Year 2 | 500-2K docs/day | $600/mo × 12 = $7,200 | $40K | **$47,200** |
| Year 3 | 2K-5K docs/day | $1,200/mo × 12 = $14,400 | $45K (0.45 FTE) | **$59,400** |
| **TOTAL** | | **$26,400** | **$125K** | **$151,400** |

### TCO Summary (3 Years)

| Option | Infra Cost | Eng Cost | **Total** | vs Docker Compose |
|--------|-----------|----------|----------|-------------------|
| **Docker Compose** | $7,680 | $65K | **$72,680** | Baseline |
| **Cloud Run** | $14,400 | $32K | **$46,400** | **36% cheaper** ✅ |
| **Kubernetes** | $26,400 | $125K | **$151,400** | **108% more expensive** ❌ |

**Key Insight**: **Cloud Run wins on TCO** due to lower engineering overhead, despite higher infra costs. Docker Compose is cheaper if you have DevOps expertise. Kubernetes is 2x more expensive overall.

---

## 7. Migration Path {#migration-path}

### Recommended Deployment Evolution

```
START
  │
  ▼
┌────────────────────────────────────────────────────┐
│ PHASE 1: Local Development (Docker Compose)       │
│ Duration: Day 1                                    │
│ - All services on laptop                           │
│ - Fast iteration, debugging                        │
└────────────────────────────────────────────────────┘
  │
  ▼
┌────────────────────────────────────────────────────┐
│ PHASE 2: MVP Deployment (Single VM + Docker Compose) │
│ Duration: Months 1-6                               │
│ Scale: 0-500 docs/day                              │
│ Cost: $40-80/month                                 │
│ - Deploy to DigitalOcean/Hetzner Droplet          │
│ - Nginx for HTTPS (Let's Encrypt)                 │
│ - GitHub Actions for CI/CD                        │
│ - Prometheus + Grafana on same VM                 │
└────────────────────────────────────────────────────┘
  │
  ▼
┌────────────────────────────────────────────────────┐
│ PHASE 3: Growth (Vertical Scaling)                │
│ Duration: Months 6-12                              │
│ Scale: 500-2K docs/day                             │
│ Cost: $80-160/month                                │
│ - Upgrade VM to 8 vCPU, 32GB RAM                  │
│ - Move Postgres to managed DB (optional)          │
│ - Increase worker replicas in compose file        │
└────────────────────────────────────────────────────┘
  │
  ├─────────────────────┬─────────────────────┐
  │                     │                     │
  ▼                     ▼                     ▼
┌─────────────┐  ┌──────────────┐  ┌─────────────────┐
│ OPTION A:   │  │ OPTION B:    │  │ OPTION C:       │
│ Docker Swarm│  │ Cloud Run    │  │ Kubernetes      │
│             │  │ (Managed)    │  │ (if justified)  │
├─────────────┤  ├──────────────┤  ├─────────────────┤
│ Duration:   │  │ Duration:    │  │ Duration:       │
│ Months 12-24│  │ Months 12-24 │  │ Years 2-3       │
│             │  │              │  │                 │
│ Scale:      │  │ Scale:       │  │ Scale:          │
│ 2K-10K      │  │ 2K-20K       │  │ 10K-100K        │
│ docs/day    │  │ docs/day     │  │ docs/day        │
│             │  │              │  │                 │
│ Cost:       │  │ Cost:        │  │ Cost:           │
│ $120-400/mo │  │ $200-800/mo  │  │ $500-2K/mo      │
│             │  │              │  │                 │
│ Effort:     │  │ Effort:      │  │ Effort:         │
│ Low (same   │  │ Low (minimal │  │ High (2-4 weeks │
│ Docker      │  │ ops)         │  │ setup)          │
│ Compose)    │  │              │  │                 │
└─────────────┘  └──────────────┘  └─────────────────┘
```

### Migration Triggers

| Trigger | Action | Reasoning |
|---------|--------|-----------|
| **Traffic exceeds 1K docs/day** | Vertical scaling (bigger VM) | Docker Compose still efficient |
| **Traffic is highly variable (0-5K)** | Migrate to Cloud Run | Auto-scaling saves cost |
| **Need multi-region (<1s latency)** | Migrate to managed service or K8s | Geographic distribution needed |
| **Team grows to 5+ engineers** | Consider K8s | Team can absorb complexity |
| **Traffic exceeds 10K docs/day** | Migrate to K8s | Complexity now justified |
| **Strict compliance requirements** | Migrate to K8s | Need RBAC, network policies |

---

## 8. Final Recommendation {#final-recommendation}

### Decision Framework

```
START: Is this a production system?
  │
  ├── NO (learning/portfolio) ──────────┐
  │                                      ▼
  │                            Try Kubernetes (Minikube)
  │                            → Learn industry standard
  │                            → Good for resume
  │
  └── YES (real users, real money)
       │
       ▼
    What's your scale?
       │
       ├── <500 docs/day ──────────────┐
       │                                ▼
       │                         Docker Compose (Single VM)
       │                         → Simplest, cheapest
       │                         → 1-day setup
       │
       ├── 500-5K docs/day ────────────┐
       │                                ▼
       │                         Docker Compose (Vertical scale)
       │                         OR Cloud Run (if bursty)
       │                         → Balance cost & simplicity
       │                         → Defer K8s complexity
       │
       └── >5K docs/day ───────────────┐
                                        ▼
                                 Cloud Run (managed)
                                 OR Kubernetes (if multi-service)
                                 → Auto-scaling critical
                                 → Complexity now justified
```

---

### For pdf-summarize Project: **Start with Docker Compose**

#### Recommended Path

**Phase 1 (Months 0-6): Docker Compose MVP**
```yaml
# MVP Stack
- 1 VM: 4 vCPU, 16GB RAM (DigitalOcean/Hetzner: $80/month)
- Docker Compose: API (2 replicas), Worker (10 replicas), Postgres, Redis
- Nginx: Reverse proxy + HTTPS (Let's Encrypt)
- Monitoring: Prometheus + Grafana on same VM
- CI/CD: GitHub Actions → SSH deploy
```

**Capacity**: 1K-5K docs/day  
**Cost**: $80/month  
**Setup Time**: 1-2 days  
**Maintenance**: 1-2 hours/week

---

**Phase 2 (Months 6-12): Evaluate Growth**

| If traffic is... | Action | Cost |
|-----------------|--------|------|
| Still <1K docs/day | Stay on Docker Compose | $80/month |
| 1K-3K docs/day, steady | Vertical scale (8 vCPU, 32GB) | $160/month |
| 3K-10K docs/day, bursty | Migrate to Cloud Run | $200-500/month |
| >10K docs/day | Start K8s migration plan (3-month project) | $500+/month |

---

**Phase 3 (Year 2+): Scale as Needed**

Only migrate to Kubernetes if:
- ✅ Traffic consistently >10K docs/day
- ✅ Team has 5+ engineers (can absorb K8s complexity)
- ✅ Need multi-region deployment
- ✅ Have 3-6 months for migration

Otherwise, stay on Docker Compose or Cloud Run.

---

### Summary Table: All Options Compared

| Aspect | Docker Compose | Cloud Run | Kubernetes |
|--------|---------------|-----------|------------|
| **Setup Time** | 1 day | 1 day | 1-2 weeks |
| **Learning Curve** | Low | Low | High (200+ hours) |
| **Cost (MVP)** | $40-80/month | $100/month | $280+/month |
| **Cost (3-year TCO)** | $73K | $46K ✅ | $151K ❌ |
| **Auto-scaling** | Manual | Automatic | Automatic |
| **Max Scale** | 5K docs/day | 20K docs/day | 100K+ docs/day |
| **Maintenance** | 1-2 hr/week | <1 hr/week | 5-10 hr/week |
| **Flexibility** | High | Medium | Highest |
| **Vendor Lock-in** | None | High (GCP) | Low (portable) |
| **Production-Ready** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Right for MVP** | ✅✅✅ | ✅✅ | ❌ |

---

## Conclusion

### Is Kubernetes Worth It? **NO, not initially.**

**Kubernetes is justified ONLY when you have**:
1. ✅ High scale (>10K requests/day)
2. ✅ Multiple complex services (10+ microservices)
3. ✅ Team expertise (engineers know K8s)
4. ✅ Multi-cloud/multi-region requirements

**For pdf-summarize project**:
- ❌ MVP scale: 100-500 docs/day (moderate, not high)
- ⚠️ 2 main services + 3 data stores (simple, not complex)
- ❌ Small team, no K8s expertise assumed
- ❌ Single region sufficient

**Verdict**: **Start with Docker Compose**. Kubernetes is a 2x cost increase with marginal benefits at MVP scale. Save 2 weeks of setup time and $78K over 3 years. Migrate to Cloud Run or K8s only when scale demands it (>5K docs/day).

---

## Resources

- **Docker Compose Docs**: https://docs.docker.com/compose/
- **Cloud Run Pricing**: https://cloud.google.com/run/pricing
- **Kubernetes Basics**: https://kubernetes.io/docs/tutorials/kubernetes-basics/
- **Docker Swarm Guide**: https://docs.docker.com/engine/swarm/
- **This Project**: https://github.com/abezr/pdf-summarize

**Recommended Reading**:
- "You Are Not Google" by Oz Nova (against premature optimization)
- "Choose Boring Technology" by Dan McKinley
- "The Cost of Kubernetes" by Itamar Turner-Trauring

---

**Bottom Line**: Optimize for **speed to market** and **cost efficiency**, not for **resume-driven development**. Docker Compose is the pragmatic choice. Kubernetes can wait.

