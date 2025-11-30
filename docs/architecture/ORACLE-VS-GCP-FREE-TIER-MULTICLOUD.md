# Oracle Cloud vs GCP Free Tier: Multi-Cloud Strategy

**Project**: pdf-summarize  
**Repository**: https://github.com/abezr/pdf-summarize  
**Date**: 2025-11-30  
**Version**: 1.0.0

---

## Executive Summary

### TL;DR: Can You Use Both for Free Load Balancing?

**YES! Oracle + GCP free tiers can be combined for:**
1. ✅ Extended compute capacity (24GB + 1GB = 25GB RAM total, free)
2. ✅ Geographic load balancing (Oracle: US/UK/Frankfurt + GCP: US/EU/Asia)
3. ✅ Cost-free redundancy (zero-cost high availability)
4. ✅ Free managed services (GCP Cloud SQL, Cloud Storage with Oracle compute)

**BUT**: Multi-cloud complexity increases operational overhead. **Only worth it after outgrowing single free tier.**

---

## Table of Contents

1. [Oracle Cloud vs GCP Free Tier: Head-to-Head](#comparison)
2. [Multi-Cloud Architecture: Using Both Free Tiers](#multicloud)
3. [Load Balancing Strategies (Free Tier)](#load-balancing)
4. [Cost Analysis: Oracle + GCP vs Single Cloud](#cost-analysis)
5. [Cheapest Paid Options: Oracle vs GCP](#cheapest-paid)
6. [Recommended Strategy: When to Go Multi-Cloud](#recommendation)

---

## 1. Oracle Cloud vs GCP Free Tier: Head-to-Head {#comparison}

### Detailed Comparison

| Aspect | Oracle Cloud Always Free | GCP Always Free | Winner |
|--------|-------------------------|-----------------|--------|
| **COMPUTE** | | | |
| VMs | 2x VM.Standard.A1.Flex (ARM64) | 1x e2-micro (x86_64) | **Oracle** ✅ |
| CPU | 4 OCPU (ARM cores) | 0.25 vCPU (shared) | **Oracle** ✅ |
| RAM | 24GB total | 1GB | **Oracle** ✅ |
| Architecture | ARM64 (Ampere Altra) | x86_64 (Intel/AMD) | **GCP** ✅ (compatibility) |
| Storage | 200GB Block Volume (SSD) | 30GB Standard PD | **Oracle** ✅ |
| | | | |
| **NETWORKING** | | | |
| Egress | 10TB/month | 1GB/month (US only), 200GB (China/Australia) | **Oracle** ✅ |
| Ingress | Unlimited | Unlimited | Tie |
| Public IP | Yes (1 per VM) | Yes (ephemeral) | Tie |
| Load Balancer | None (free) | None (free) | Tie |
| | | | |
| **MANAGED SERVICES** | | | |
| Object Storage | 20GB (10GB std + 10GB archive) | 5GB Cloud Storage (Regional) | **Oracle** ✅ |
| Database | 2x Autonomous DB (1 OCPU, 20GB each) | None (free tier ended 2024) | **Oracle** ✅ |
| NoSQL | None | Firestore (1GB) | **GCP** ✅ |
| Functions | None | Cloud Functions (2M invocations) | **GCP** ✅ |
| Cloud Run | None | Cloud Run (2M requests, 360K vCPU-s) | **GCP** ✅ |
| | | | |
| **OBSERVABILITY** | | | |
| Monitoring | Basic metrics | Cloud Monitoring (free tier: 150MB/month) | **GCP** ✅ |
| Logging | Basic logs | Cloud Logging (free tier: 50GB/month) | **GCP** ✅ |
| Tracing | None | Cloud Trace (free tier) | **GCP** ✅ |
| | | | |
| **LIMITATIONS** | | | |
| Duration | Forever | Forever | Tie |
| Credit Card | Required | Required | Tie |
| Geographic | Limited regions | Global | **GCP** ✅ |
| Support | Poor (free tier = no SLA) | Poor (free tier = no SLA) | Tie |
| Account Approval | 1-2 days (sometimes instant) | Instant | **GCP** ✅ |

---

### Key Takeaways

**Oracle Cloud Always Free DOMINATES on:**
- ✅ Compute (24GB vs 1GB RAM = 24x more)
- ✅ Storage (200GB vs 30GB = 6.7x more)
- ✅ Egress (10TB vs 1GB = 10,000x more)
- ✅ Database (2x 20GB databases included)

**GCP Always Free WINS on:**
- ✅ Architecture (x86_64 = better Docker image compatibility)
- ✅ Managed services (Cloud Run, Functions, Firestore)
- ✅ Observability (Cloud Monitoring, Logging, Trace)
- ✅ Instant signup (no waiting)

---

### Capacity Estimate: Oracle vs GCP

#### Oracle Cloud Always Free (2 OCPU, 12GB RAM per VM)

**With 24GB RAM total**:
- API Gateway: 4 replicas × 400 req/min = **1,600 req/min**
- Worker: 16 workers × 6 docs/hour = 96 docs/hour = **2,304 docs/day**
- PostgreSQL: 4GB RAM = handles 10K+ docs
- Redis: 2GB cache = 1,000 graphs
- Prometheus + Grafana: Separate VM (12GB RAM)

**Bottleneck**: LLM API rate limits (not compute)

---

#### GCP Always Free (0.25 vCPU, 1GB RAM)

**With 1GB RAM total**:
- API Gateway: 1 replica (512MB) → **~50 req/min**
- Worker: 1 worker (256MB) → 1-2 docs/hour = **~40 docs/day**
- PostgreSQL: Must use managed (RDS ended free tier in 2024)
- Redis: Must use Memorystore (paid, ~$30/month) OR skip

**Bottleneck**: RAM (1GB is VERY limiting)

**Verdict**: **Oracle is 50x more capable for compute workloads.**

---

### GCP's Secret Weapon: Generous Free Tier for SERVERLESS

While GCP's VM free tier is weak, its **serverless free tier is excellent**:

| Service | Free Tier | Suitable For |
|---------|-----------|--------------|
| **Cloud Run** | 2M requests/month, 360K vCPU-seconds | API Gateway (lightweight requests) |
| **Cloud Functions** | 2M invocations/month | Webhooks, async processing |
| **Cloud Storage** | 5GB storage, 1GB egress | PDF storage |
| **Firestore** | 1GB storage, 50K reads, 20K writes | Metadata DB |

**Strategy**: Use Oracle for compute-heavy workers, GCP for serverless API + storage.

---

## 2. Multi-Cloud Architecture: Using Both Free Tiers {#multicloud}

### Architecture 1: Oracle Compute + GCP Managed Services (RECOMMENDED)

```
┌─────────────────────────────────────────────────────────────────┐
│ USER REQUEST                                                     │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ GCP Cloud Run (API Gateway)                                     │
│ - 2M requests/month FREE                                        │
│ - Auto-scaling, HTTPS, load balancing                           │
│ - Lightweight: validation, auth, routing                        │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼ (Internal API call)
┌─────────────────────────────────────────────────────────────────┐
│ ORACLE CLOUD (Worker Cluster)                                  │
│ VM1: 2 OCPU, 12GB RAM (ARM64)                                   │
│   - 8x Document Processor Workers                               │
│   - PostgreSQL (4GB RAM)                                        │
│   - Redis (2GB RAM)                                             │
│                                                                  │
│ VM2: 2 OCPU, 12GB RAM (ARM64)                                   │
│   - Prometheus (4GB RAM)                                        │
│   - Grafana (2GB RAM)                                           │
│   - Backup workers (4 replicas)                                 │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ GCP Storage (Cloud Storage + Firestore)                        │
│ - Cloud Storage: 5GB PDFs + 1GB egress FREE                    │
│ - Firestore: 1GB metadata + 50K reads FREE                     │
└─────────────────────────────────────────────────────────────────┘
```

**Why This Works**:
- ✅ GCP Cloud Run handles API traffic (serverless, free up to 2M requests)
- ✅ Oracle compute does heavy processing (24GB RAM for workers)
- ✅ GCP storage for files (5GB free, good for small PDFs)
- ✅ Total cost: **$0/month** (within free tiers)

**Capacity**:
- 2M requests/month = 66K requests/day
- Oracle workers: 2,304 docs/day
- Combined: **2,300 docs/day @ $0/month**

---

### Architecture 2: Geographic Load Balancing (Multi-Region)

```
┌──────────────────────────────────────────────────────────────────┐
│ CLOUDFLARE (Free CDN/Load Balancer)                              │
│ - Geo-routing: US East → Oracle US, EU → Oracle UK, Asia → GCP  │
│ - DDoS protection, HTTPS, caching                                │
└───────────┬────────────────────────────┬─────────────────────────┘
            │                            │
            ▼                            ▼
┌────────────────────────┐   ┌────────────────────────────┐
│ ORACLE CLOUD (US-East) │   │ ORACLE CLOUD (UK-London)   │
│ 2 OCPU, 12GB RAM       │   │ 2 OCPU, 12GB RAM           │
│ - API + Workers        │   │ - API + Workers            │
│ - PostgreSQL (primary) │   │ - PostgreSQL (replica)     │
└────────────────────────┘   └────────────────────────────┘
            │
            ▼
┌────────────────────────────────────────────────────────┐
│ GCP (us-central1) - Backup + Asia Traffic             │
│ Cloud Run: API Gateway (2M requests/month)            │
│ Cloud Storage: Shared file storage (5GB)              │
└────────────────────────────────────────────────────────┘
```

**Why This Works**:
- ✅ Cloudflare free tier = global load balancer (unlimited traffic)
- ✅ Oracle VMs in 2 regions (US + UK = low latency for US/EU users)
- ✅ GCP Cloud Run for Asia/overflow traffic
- ✅ Total cost: **$0/month** (all free tiers)

**Benefits**:
- Global latency: <100ms for 95% of users
- High availability: 3 regions (Oracle US, Oracle UK, GCP US)
- Zero cost for geo-distribution

---

### Architecture 3: Active-Active Load Balancing (High Availability)

```
┌──────────────────────────────────────────────────────────────────┐
│ DNS ROUND-ROBIN (Free)                                           │
│ - api.example.com → [Oracle IP, GCP Cloud Run URL]              │
│ - 50% traffic to Oracle, 50% to GCP                              │
└───────────┬──────────────────────────┬───────────────────────────┘
            │                          │
            ▼                          ▼
┌────────────────────────┐   ┌────────────────────────────┐
│ ORACLE CLOUD (Primary) │   │ GCP Cloud Run (Backup)     │
│ 2x VM (24GB RAM total) │   │ - Auto-scale 0-100         │
│ - 16 workers           │   │ - Lightweight API only     │
│ - PostgreSQL           │   │ - Fallback to Oracle DB    │
│ - Redis                │   │   via Cloud SQL Proxy      │
│ - Handles 2K docs/day  │   │ - Handles 200 docs/day     │
└────────────────────────┘   └────────────────────────────┘
            │                          │
            └──────────┬───────────────┘
                       ▼
┌──────────────────────────────────────────────────────────┐
│ SHARED POSTGRESQL (Oracle Cloud)                        │
│ - Master DB on Oracle (4GB RAM)                          │
│ - GCP connects via public IP (SSL required)              │
└──────────────────────────────────────────────────────────┘
```

**Why This Works**:
- ✅ DNS round-robin = free load balancing (no cost)
- ✅ Oracle handles bulk (2K docs/day)
- ✅ GCP handles overflow (200 docs/day)
- ✅ Automatic failover (if Oracle down, GCP takes all traffic)
- ✅ Total cost: **$0/month**

**Drawbacks**:
- ❌ DNS round-robin = no health checks (some requests may hit dead server)
- ❌ Database on Oracle only (single point of failure)
- ❌ Cross-cloud latency (GCP → Oracle DB = 50-100ms)

---

## 3. Load Balancing Strategies (Free Tier) {#load-balancing}

### Option 1: Cloudflare Free (RECOMMENDED)

**What You Get**:
- Unlimited bandwidth
- DDoS protection
- HTTPS (free SSL)
- Geo-routing (route users to nearest server)
- Health checks (remove dead servers)
- Caching (reduce origin load)

**Setup**:
```bash
# 1. Sign up at https://cloudflare.com (free tier)
# 2. Add domain (e.g., example.com)
# 3. Update nameservers at domain registrar
# 4. Create Load Balancer:
#    - Pool 1: Oracle Cloud US (Public IP)
#    - Pool 2: Oracle Cloud UK (Public IP)
#    - Pool 3: GCP Cloud Run (URL)
# 5. Geo-routing:
#    - US traffic → Pool 1
#    - EU traffic → Pool 2
#    - Asia traffic → Pool 3
# 6. Health checks:
#    - HTTP GET /health every 60s
#    - If 2 consecutive fails, remove from pool
```

**Cost**: **$0/month** (Cloudflare free tier is generous)

**Benefits**:
- ✅ True load balancing (not DNS round-robin)
- ✅ Health checks (automatic failover)
- ✅ Geo-routing (low latency globally)
- ✅ DDoS protection (up to 10M requests/day)
- ✅ Analytics (traffic insights)

---

### Option 2: DNS Round-Robin (Free, but Basic)

**What You Get**:
- Multiple A records for same domain
- 50/50 traffic split (or weighted)
- Zero cost (built into DNS)

**Setup**:
```bash
# In your DNS provider (Cloudflare, Route53, etc.):
# Add multiple A records:
api.example.com.  A  141.148.123.45  (Oracle Cloud US)
api.example.com.  A  158.101.56.78   (Oracle Cloud UK)
api.example.com.  A  34.120.45.67    (GCP VM)

# OR use weighted records (if supported):
api.example.com.  A  141.148.123.45  (weight: 70)  # Oracle
api.example.com.  A  34.120.45.67    (weight: 30)  # GCP
```

**Cost**: **$0/month**

**Drawbacks**:
- ❌ No health checks (users may hit dead server)
- ❌ No session affinity (each request may hit different server)
- ❌ DNS caching (TTL = 300s, slow to react to failures)
- ❌ Not true load balancing (just random distribution)

---

### Option 3: Nginx Reverse Proxy (Self-Hosted, Free)

**What You Get**:
- True load balancing (round-robin, least-conn, ip-hash)
- Health checks (remove dead servers)
- Session affinity (sticky sessions)
- SSL termination

**Setup**:
```nginx
# /etc/nginx/nginx.conf
http {
    upstream backend {
        least_conn;  # Send to server with least connections
        
        server 141.148.123.45:8080 weight=3;  # Oracle US (70% traffic)
        server 158.101.56.78:8080 weight=1;   # Oracle UK (20%)
        server 34.120.45.67:8080 weight=1;    # GCP VM (10%)
        
        # Health checks (nginx-plus only, OR use free alternative)
        # For free nginx, use: max_fails=3 fail_timeout=30s
    }
    
    server {
        listen 443 ssl;
        server_name api.example.com;
        
        ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;
        
        location / {
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }
    }
}
```

**Cost**: 
- Nginx VM: Use Oracle free tier VM (1 OCPU, 6GB RAM)
- Total: **$0/month**

**Drawbacks**:
- ❌ Single point of failure (if Nginx VM dies, everything dies)
- ❌ Need to manage Nginx VM (updates, monitoring)
- ❌ No geo-routing (unless you deploy multiple Nginx VMs globally)

---

### Comparison: Load Balancing Options

| Feature | Cloudflare | DNS Round-Robin | Nginx Proxy |
|---------|-----------|-----------------|-------------|
| **Cost** | $0 | $0 | $0 (uses free VM) |
| **Setup Complexity** | Low | Very Low | Medium |
| **Health Checks** | ✅ Yes | ❌ No | ✅ Yes (basic) |
| **Geo-Routing** | ✅ Yes | ❌ No | ❌ No (single region) |
| **DDoS Protection** | ✅ Yes | ❌ No | ❌ No |
| **Failover Speed** | Fast (60s) | Slow (5min, DNS TTL) | Fast (5s) |
| **Session Affinity** | ✅ Yes | ❌ No | ✅ Yes |
| **SSL Termination** | ✅ Yes | N/A | ✅ Yes |
| **Analytics** | ✅ Yes | ❌ No | ❌ No (unless custom) |
| **Single Point of Failure** | ❌ No (Cloudflare is distributed) | ❌ No (DNS is distributed) | ✅ Yes (Nginx VM) |

**Winner**: **Cloudflare Free** ✅ (best features, zero cost, no single point of failure)

---

## 4. Cost Analysis: Oracle + GCP vs Single Cloud {#cost-analysis}

### Scenario 1: Stay Within Free Tiers

#### Single Cloud (Oracle Only)

**Resources**:
- 2x VM (24GB RAM total)
- 200GB storage
- 10TB egress
- PostgreSQL + Redis on VM

**Capacity**: 2,300 docs/day

**Cost**: **$0/month**

**Engineering Overhead**: 0.25 FTE (10 hours/week)
- Manage Oracle VMs
- Monitor services
- Security patches

---

#### Multi-Cloud (Oracle + GCP Free Tiers)

**Resources**:
- Oracle: 2x VM (24GB RAM) for workers
- GCP: Cloud Run (2M requests) for API
- GCP: Cloud Storage (5GB) for PDFs
- GCP: Firestore (1GB) for metadata

**Capacity**: 2,300 docs/day (same as Oracle only)

**Cost**: **$0/month**

**Engineering Overhead**: 0.35 FTE (14 hours/week)
- Manage Oracle VMs (8 hours)
- Manage GCP services (3 hours)
- Cross-cloud networking (2 hours)
- Multi-cloud monitoring (1 hour)

**Overhead Increase**: +40% (4 hours/week more)

**TCO Over 3 Years**:
- Oracle Only: $0 infra + $80K eng = **$80K**
- Multi-Cloud: $0 infra + $112K eng = **$112K** (40% more expensive)

**Verdict**: **Multi-cloud NOT worth it if staying in free tiers** (adds complexity without capacity gain).

---

### Scenario 2: Outgrow Free Tier, Need More Capacity

#### Single Cloud (Oracle Paid)

**Resources**:
- Upgrade to 4x VM.Standard.E4.Flex (4 OCPU, 16GB RAM each = 64GB total)
- Cost: ~$80/month

**Capacity**: 10K docs/day

**Cost**: $80/month = $960/year

---

#### Multi-Cloud (Oracle Free + GCP Paid)

**Resources**:
- Oracle: Keep free 2x VM (24GB RAM) for workers
- GCP: Upgrade Cloud Run ($200/month for 10M requests, auto-scaling)
- GCP: Cloud SQL ($50/month for db-f1-micro)

**Capacity**: 10K docs/day

**Cost**: $250/month = $3,000/year

**Verdict**: **Single cloud (Oracle paid) 3x cheaper** ($960 vs $3,000).

---

### Scenario 3: Need Geographic Distribution

#### Single Cloud (Oracle Paid, Multi-Region)

**Resources**:
- Oracle US: 2x VM (24GB) = $0 (free tier)
- Oracle UK: 2x VM (24GB) = $80/month (paid)
- Oracle Japan: 2x VM (24GB) = $80/month (paid)

**Cost**: $160/month = $1,920/year

**Coverage**: US (free), EU (paid), Asia (paid)

---

#### Multi-Cloud (Oracle Free + GCP Free, Geo-Distributed)

**Resources**:
- Oracle US: 2x VM (24GB) = $0 (free tier)
- Oracle UK: 2x VM (24GB) = $0 (free tier, UK region available)
- GCP Asia: Cloud Run = $0 (free tier, overflow only)

**Cost**: **$0/month** (all free tiers)

**Coverage**: US (free), EU (free), Asia (free)

**Verdict**: **Multi-cloud WINS for geo-distribution** (3 regions @ $0 vs $160/month).

---

## 5. Cheapest Paid Options: Oracle vs GCP {#cheapest-paid}

### Oracle Cloud: Cheapest Paid VM

| Instance Type | CPU | RAM | Storage | Cost (per month) | Use Case |
|--------------|-----|-----|---------|------------------|----------|
| **VM.Standard.E4.Flex** (x86) | 1 OCPU | 1GB | 50GB | **$6.50** | Tiny apps |
| **VM.Standard.E4.Flex** (x86) | 1 OCPU | 4GB | 50GB | **$10.50** | Small apps |
| **VM.Standard.E4.Flex** (x86) | 2 OCPU | 8GB | 100GB | **$21** | Medium apps ✅ |
| **VM.Standard.E4.Flex** (x86) | 4 OCPU | 16GB | 200GB | **$42** | Production |

**Notes**:
- OCPU = Oracle CPU Unit (1 OCPU ≈ 2 vCPU Intel)
- Flex shapes = pay only for what you use (by the second)
- x86_64 architecture (better Docker compatibility than ARM)

---

### GCP: Cheapest Paid VM

| Instance Type | CPU | RAM | Storage | Cost (per month) | Use Case |
|--------------|-----|-----|---------|------------------|----------|
| **e2-micro** (free tier) | 0.25 vCPU | 1GB | 30GB | **$0** (free tier) | Tiny apps |
| **e2-small** | 0.5 vCPU | 2GB | 10GB | **$12** | Small apps |
| **e2-medium** | 1 vCPU | 4GB | 10GB | **$24** | Medium apps ✅ |
| **e2-standard-2** | 2 vCPU | 8GB | 10GB | **$49** | Production |

**Notes**:
- vCPU = shared CPU (not dedicated)
- Storage separate: $0.04/GB/month (10GB PD = $0.40/month)
- Egress: $0.12/GB (after free 1GB)

---

### Cheapest Paid: Oracle vs GCP

| Requirement | Oracle | GCP | Winner |
|------------|--------|-----|--------|
| **1 vCPU, 4GB RAM** | $10.50 | $24 | **Oracle** ($13.50 cheaper) |
| **2 vCPU, 8GB RAM** | $21 | $49 | **Oracle** ($28 cheaper) |
| **4 vCPU, 16GB RAM** | $42 | $98 | **Oracle** ($56 cheaper) |
| **Egress (1TB)** | ~$10 (generous) | ~$120 ($0.12/GB) | **Oracle** ($110 cheaper) |

**Verdict**: **Oracle is 50-60% cheaper for compute** (but GCP has better managed services).

---

### Cheapest Paid Options: Other Clouds

For comparison, here are ultra-cheap alternatives:

| Provider | Instance | CPU | RAM | Cost/Month | Notes |
|----------|---------|-----|-----|------------|-------|
| **Hetzner** | CX21 | 2 vCPU | 4GB | **$4.50** ✅ | Best value, EU-only |
| **Contabo** | VPS S | 4 vCPU | 8GB | **$5** ✅ | Oversold, variable perf |
| **OVHcloud** | B2-7 | 2 vCPU | 7GB | **$7** | EU-only |
| **Oracle** | E4.Flex | 2 OCPU | 8GB | **$21** | Good value |
| **DigitalOcean** | Basic | 1 vCPU | 1GB | **$6** | Reliable, simple |
| **GCP** | e2-medium | 1 vCPU | 4GB | **$24** | Expensive, but managed |

**Absolute Cheapest**: **Hetzner CX21 ($4.50/month)** — but EU-only, no global presence.

---

## 6. Recommended Strategy: When to Go Multi-Cloud {#recommendation}

### Decision Tree: Should You Use Multi-Cloud?

```
START: Do you need more capacity than Oracle free tier (24GB RAM)?
  │
  ├── NO (0-2K docs/day) ──────────────────────┐
  │                                             ▼
  │                                      STAY SINGLE CLOUD (Oracle)
  │                                      → $0/month
  │                                      → 0.25 FTE (simple)
  │
  └── YES (>2K docs/day)
       │
       ▼
    Do you need GEOGRAPHIC distribution (multi-region)?
       │
       ├── YES (users in US, EU, Asia) ────────┐
       │                                         ▼
       │                                  GO MULTI-CLOUD
       │                                  → Oracle US + Oracle UK (free)
       │                                  → GCP Cloud Run Asia (free)
       │                                  → Cloudflare load balancer (free)
       │                                  → $0/month, 0.35 FTE
       │
       └── NO (single region sufficient)
            │
            ▼
         Is your workload COMPUTE-HEAVY or SERVERLESS?
            │
            ├── COMPUTE-HEAVY (workers) ───────┐
            │                                   ▼
            │                            STAY SINGLE CLOUD (Oracle)
            │                            → Upgrade to paid ($21-42/month)
            │                            → 2-4 OCPU, 8-16GB RAM
            │                            → 0.25 FTE (simple)
            │
            └── SERVERLESS (API, functions) ───┐
                                                ▼
                                         GO MULTI-CLOUD
                                         → Oracle for workers (free)
                                         → GCP Cloud Run for API (free)
                                         → Best of both worlds
                                         → $0/month, 0.3 FTE
```

---

### Recommended Strategies by Scenario

#### Scenario 1: MVP (0-500 docs/day)

**Recommendation**: **Oracle Cloud Only** (Always Free)

**Why**:
- 24GB RAM is PLENTY for MVP
- Single cloud = simple (0.25 FTE)
- $0/month forever

**Architecture**:
```
Oracle Cloud VM1 (2 OCPU, 12GB RAM):
  - API Gateway
  - 8x Workers
  - PostgreSQL
  - Redis
```

**Cost**: **$0/month**  
**Effort**: **1 day setup, 10 hours/week maintenance**

---

#### Scenario 2: Growth (500-2K docs/day, single region)

**Recommendation**: **Oracle Cloud Only** (Stay Free)

**Why**:
- Still within free tier capacity
- Adding GCP doesn't increase capacity meaningfully
- Multi-cloud adds 40% overhead

**Architecture**:
```
Oracle VM1: API + 8 workers + DB (12GB)
Oracle VM2: 8 workers + monitoring (12GB)
```

**Cost**: **$0/month**  
**Effort**: **10 hours/week**

---

#### Scenario 3: Scale (2K-5K docs/day, single region)

**Recommendation**: **Oracle Paid** (Upgrade, Stay Single Cloud)

**Why**:
- Oracle paid ($21/month) cheaper than GCP
- Multi-cloud not worth complexity

**Architecture**:
```
Oracle Paid VM (2 OCPU, 8GB RAM, $21/month):
  - API + 12 workers + DB
```

**Cost**: **$21/month**  
**Effort**: **10 hours/week** (same as free tier)

---

#### Scenario 4: Geographic Distribution (multi-region)

**Recommendation**: **Multi-Cloud (Oracle US + Oracle UK + GCP Asia)** ✅

**Why**:
- 3 regions @ $0/month (all free tiers)
- Low latency globally
- High availability
- Oracle single-region paid = $160/month

**Architecture**:
```
Oracle US (free): 2 OCPU, 12GB RAM
Oracle UK (free): 2 OCPU, 12GB RAM
GCP Asia (Cloud Run, free): 2M requests/month
Cloudflare (free): Load balancer + geo-routing
```

**Cost**: **$0/month** (vs $160/month for Oracle paid multi-region)  
**Effort**: **14 hours/week** (40% more, but saves $160/month = $1,920/year)

**ROI**: Saves $1,920/year, costs 4 hours/week × $50/hour = $10K/year in eng time → **LOSS of $8K**

**Verdict**: **Only worth it if you NEED geo-distribution** (not for cost savings).

---

#### Scenario 5: Hybrid (Compute-Heavy Workers + Serverless API)

**Recommendation**: **Multi-Cloud (Oracle Workers + GCP Cloud Run API)** ✅

**Why**:
- Oracle free tier: 24GB RAM for compute
- GCP Cloud Run: 2M requests/month for API (serverless)
- Best of both worlds

**Architecture**:
```
GCP Cloud Run (API Gateway, free):
  - Handle incoming requests
  - Lightweight: auth, validation, routing
  - Auto-scaling 0-100 instances

Oracle Cloud (Worker Cluster, free):
  - 16 workers (2x VM, 24GB RAM)
  - PostgreSQL (4GB RAM)
  - Redis (2GB RAM)

GCP Cloud Storage (free):
  - 5GB PDF storage
  - 1GB egress
```

**Cost**: **$0/month**  
**Capacity**: 2,300 docs/day  
**Effort**: **12 hours/week** (20% more overhead)

**Verdict**: **Worth it** — leverages strengths of each platform (Oracle compute, GCP serverless).

---

### When Multi-Cloud Makes Sense: Checklist

Use multi-cloud ONLY if you have **2+ of these**:

1. ✅ **Geographic distribution needed** (users in 3+ continents)
2. ✅ **Hybrid workload** (compute-heavy + serverless)
3. ✅ **High availability critical** (99.95%+ uptime)
4. ✅ **Vendor lock-in avoidance** (strategic requirement)
5. ✅ **Team expertise** (engineers know both Oracle + GCP)

**For pdf-summarize project**: **1 / 5** ❌ (not justified yet)

**Recommendation**: **Start single-cloud (Oracle), go multi-cloud only when hitting limits.**

---

## Summary Tables

### Oracle vs GCP Free Tier: Quick Reference

| Aspect | Oracle Always Free | GCP Always Free | Winner |
|--------|-------------------|----------------|--------|
| **Compute** | 24GB RAM, 4 ARM cores | 1GB RAM, 0.25 vCPU | **Oracle** (24x more) |
| **Storage** | 200GB | 30GB | **Oracle** (6.7x more) |
| **Egress** | 10TB | 1GB | **Oracle** (10,000x more) |
| **Architecture** | ARM64 | x86_64 | **GCP** (compatibility) |
| **Serverless** | None | Cloud Run, Functions | **GCP** |
| **Observability** | Basic | Cloud Monitoring/Logging | **GCP** |
| **Capacity** | 2,300 docs/day | 40 docs/day | **Oracle** (50x more) |

---

### Multi-Cloud TCO: 3-Year Comparison

| Strategy | Infra Cost | Eng Cost (FTE) | **TOTAL** | Notes |
|----------|-----------|----------------|-----------|-------|
| **Oracle Only (Free)** | $0 | $80K (0.25) | **$80K** | Simple, sufficient for most |
| **Multi-Cloud (Free)** | $0 | $112K (0.35) | **$112K** | +40% overhead, no capacity gain |
| **Oracle Paid (Single)** | $7.6K | $80K (0.25) | **$88K** | More capacity, still simple |
| **Multi-Cloud (Geo)** | $0 | $112K (0.35) | **$112K** | 3 regions @ $0, worth for global |

**Best Strategy**: **Start Oracle only, add GCP only for geo-distribution or serverless.**

---

### Load Balancing Options: Quick Reference

| Option | Cost | Setup | Health Checks | Geo-Routing | Winner |
|--------|------|-------|---------------|-------------|--------|
| **Cloudflare** | $0 | Easy | ✅ Yes | ✅ Yes | **Best** ✅ |
| **DNS Round-Robin** | $0 | Very Easy | ❌ No | ❌ No | Basic |
| **Nginx Proxy** | $0 | Medium | ✅ Yes | ❌ No | Good for single region |

---

## Final Recommendation

### For pdf-summarize Project

**PHASE 1 (MVP, Months 0-6): Oracle Only**
```
Platform: Oracle Cloud Always Free (2x VM, 24GB RAM)
Cost:     $0/month
Capacity: 2,300 docs/day
Effort:   10 hours/week
```

**Why**: Simple, sufficient, $0 cost. No need for complexity yet.

---

**PHASE 2 (Growth, Months 6-18): Still Oracle Only**
```
IF <2K docs/day:  Stay on Oracle Free ($0/month)
IF 2K-5K docs/day: Upgrade to Oracle Paid ($21/month)
```

**Why**: Single cloud easier to manage. Multi-cloud adds 40% overhead with no capacity gain.

---

**PHASE 3 (Scale, Year 2+): Consider Multi-Cloud IF:**
- ✅ You need **geographic distribution** (users in US, EU, Asia)
- ✅ You have **hybrid workload** (compute workers + serverless API)
- ✅ You need **99.95%+ uptime** (multi-region HA)

**Multi-Cloud Architecture** (if triggered):
```
Oracle US (free):    2 OCPU, 12GB RAM (workers)
Oracle UK (free):    2 OCPU, 12GB RAM (workers)
GCP Cloud Run (free): 2M requests/month (API)
Cloudflare (free):   Load balancer + geo-routing

Cost:     $0/month (all free tiers)
Capacity: 3 regions, 2,300 docs/day each = 6,900 docs/day
Effort:   14 hours/week (+40% overhead)
```

---

## Bottom Line

**Can you use both Oracle + GCP free tiers for load balancing?**

✅ **YES**, and it's **free** ($0/month with Cloudflare as load balancer).

**Should you?**

- ❌ **NO** if you're under 2K docs/day (single Oracle free tier sufficient)
- ✅ **YES** if you need geographic distribution (3 regions @ $0)
- ✅ **YES** if you have hybrid workload (compute + serverless)

**For most cases**: **Start single-cloud (Oracle), add multi-cloud only when justified.**

**The math**: Multi-cloud saves infrastructure cost but adds 40% engineering overhead. Only worth it for geo-distribution or strategic reasons, not for raw capacity.

---

## Resources

- **Oracle Cloud Free Tier**: https://www.oracle.com/cloud/free/
- **GCP Free Tier**: https://cloud.google.com/free
- **Cloudflare Free**: https://www.cloudflare.com/plans/free/
- **This Project**: https://github.com/abezr/pdf-summarize

**Remember**: The best architecture is the one you can maintain. Start simple, add complexity only when justified by real needs.

