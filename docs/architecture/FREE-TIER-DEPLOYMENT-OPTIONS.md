# Free-Tier Deployment Options Analysis

**Project**: pdf-summarize  
**Repository**: https://github.com/abezr/pdf-summarize  
**Date**: 2025-11-30  
**Version**: 1.0.0

---

## Executive Summary

### Why Did Cloud Run Win in TCO Analysis?

**Cloud Run won on 3-year Total Cost of Ownership ($46K) vs Docker Compose ($73K) primarily due to ENGINEERING OVERHEAD, not infrastructure cost.**

```
Cloud Run TCO Breakdown (3 years):
  Infrastructure: $14,400  (higher than Docker Compose's $7,680)
  Engineering:    $32,000  (MUCH lower than Docker Compose's $65,000)
  ─────────────────────────
  TOTAL:          $46,400  (36% cheaper overall)

Why Engineering Cost is Lower:
  - 0.1 FTE (4 hours/week) vs 0.2-0.25 FTE (8-10 hours/week)
  - No VM patching, no Docker updates, no monitoring setup
  - Auto-scaling = no capacity planning
  - Built-in observability = no Prometheus/Grafana setup
```

**However, if you value ZERO COST over convenience, Docker Compose on free-tier VMs is superior.**

---

## Table of Contents

1. [Why Cloud Run Won (TCO Analysis Explained)](#why-cloud-run-won)
2. [Completely Free-Tier Options](#free-tier-options)
3. [Cost Comparison: Free vs Paid](#cost-comparison)
4. [Recommended Strategy: Start Free](#recommended-strategy)
5. [Migration Path from Free to Paid](#migration-path)

---

## 1. Why Cloud Run Won (TCO Analysis Explained) {#why-cloud-run-won}

### The Math Behind Cloud Run's Victory

#### Scenario: 3-Year Projection (100 → 5,000 docs/day growth)

| Aspect | Docker Compose | Cloud Run | Winner |
|--------|---------------|-----------|--------|
| **Infrastructure Cost** | $7,680 | $14,400 | Docker Compose ✅ |
| **Engineering Time** | 0.2-0.25 FTE | 0.1 FTE | Cloud Run ✅ |
| **Engineering Cost** | $65,000 | $32,000 | Cloud Run ✅ |
| **Total** | $72,680 | $46,400 | **Cloud Run** ✅ |

---

### Why Engineering Cost Dominates

**Docker Compose Engineering Tasks** (8-10 hours/week = 0.2-0.25 FTE):

**Weekly Tasks** (2-3 hours):
- Monitor VM health (CPU, memory, disk usage)
- Investigate container crashes, restart services
- Review logs for errors
- Check backup integrity
- Security alerts triage

**Monthly Tasks** (5-8 hours):
- VM OS patching (`apt update`, `apt upgrade`, reboot)
- Docker/Docker Compose version upgrades
- SSL certificate renewal (Let's Encrypt every 90 days)
- Log rotation cleanup
- Database maintenance (vacuum, reindex)
- Prometheus/Grafana dashboard updates
- Cost optimization review

**Quarterly Tasks** (10-15 hours):
- Major version upgrades (PostgreSQL 14 → 15, Node.js 18 → 20)
- Security audit (check CVEs, update dependencies)
- Capacity planning (do we need bigger VM?)
- Disaster recovery drills
- Performance tuning

**Annual Tasks** (20-30 hours):
- Infrastructure review & redesign
- Major refactoring (e.g., migrate to Docker Swarm)
- Negotiate VM provider contracts
- Comprehensive security audit

**Total: ~400-500 hours/year = 0.2-0.25 FTE = $20-25K/year** (assuming $100K engineer salary)

---

**Cloud Run Engineering Tasks** (4 hours/week = 0.1 FTE):

**Weekly Tasks** (1 hour):
- Check Cloud Monitoring dashboards
- Review error logs (Cloud Logging)
- Verify auto-scaling is working

**Monthly Tasks** (2-3 hours):
- Deploy new versions (`gcloud run deploy`)
- Review cost reports
- Update secrets/configs

**Quarterly Tasks** (3-5 hours):
- Update container images (Node.js, dependencies)
- Security audit (container vulnerabilities)

**Annual Tasks** (5-10 hours):
- Infrastructure review
- Cost optimization (switch regions, adjust min/max instances)

**Total: ~200 hours/year = 0.1 FTE = $10K/year**

---

### Why Cloud Run Saves Engineering Time

| Task | Docker Compose | Cloud Run | Time Saved |
|------|---------------|-----------|------------|
| **VM Management** | SSH, patch, reboot (2h/month) | None (fully managed) | **24h/year** |
| **Scaling** | Manual SSH + edit compose file (1h) | Auto-scaling (0h) | **12h/year** |
| **Monitoring Setup** | Install Prometheus/Grafana (10h initial, 2h/month maintenance) | Built-in Cloud Monitoring (0h) | **34h/year** |
| **Load Balancing** | Configure Nginx (5h initial, 1h/quarter updates) | Built-in (0h) | **9h/year** |
| **SSL Certificates** | Certbot setup + renewals (3h initial, 1h/quarter) | Automatic (0h) | **7h/year** |
| **Deployments** | SSH + pull + restart (30min) | `gcloud run deploy` (5min) | **13h/year** (assuming 2 deploys/week) |
| **Disaster Recovery** | Manual backups, restore scripts (10h setup, 2h/quarter testing) | Automatic rollback (0h) | **18h/year** |

**Total Savings: ~117 hours/year** (almost 3 work-weeks)

---

### When Cloud Run Doesn't Win

Cloud Run loses in these scenarios:

1. **Extremely Low Budget ($0 budget)**
   - Free-tier VMs (Oracle Cloud, AWS Free Tier) beat Cloud Run
   - Docker Compose on free VM = $0/month
   - Cloud Run = $10-100/month (no free tier for sustained load)

2. **Very Low Traffic (<100 docs/day)**
   - Overhead of learning Cloud Run not worth it
   - Single VM Docker Compose sufficient
   - Cost difference: $40 vs $10 (both negligible)

3. **Need Maximum Control**
   - Custom kernel modules, exotic networking
   - Docker Compose on bare metal/VM wins

4. **Multi-Cloud Requirement**
   - Cloud Run = GCP lock-in
   - Docker Compose portable everywhere

5. **Learning/Educational Project**
   - Docker Compose teaches more fundamentals
   - Cloud Run abstracts too much

---

## 2. Completely Free-Tier Options {#free-tier-options}

### Overview of Free Tiers

| Provider | Free Resources | Limitations | Best For |
|----------|---------------|-------------|----------|
| **Oracle Cloud (Always Free)** ✅ | 4 ARM cores, 24GB RAM (2 VMs) | ARM architecture, 200GB disk total | **Best free option** |
| **AWS Free Tier (12 months)** | t2.micro (1 vCPU, 1GB RAM) | 750 hours/month, expires after 1 year | Quick POC |
| **GCP Free Tier (Always Free)** | e2-micro (0.25 vCPU, 1GB RAM) | Weak specs, only 1 instance | Not sufficient |
| **Azure Free Tier (12 months)** | B1S (1 vCPU, 1GB RAM) | 750 hours/month, expires after 1 year | Quick POC |
| **Hetzner Cloud** | None (but cheapest: €4.15/mo) | Not free, but ultra-cheap | Best paid budget option |
| **Fly.io Free Tier** | 3 shared-CPU VMs, 3GB RAM total | 160GB outbound/month | Good for small apps |
| **Railway Free Tier** | $5 credit/month | Expires quickly | Demo only |
| **Render Free Tier** | 750 hours/month web service | Spins down after 15min inactivity | Hobby projects |

---

### Option 1: Oracle Cloud Always Free Tier (BEST FREE OPTION)

#### What You Get

**Compute**:
- 2x VM.Standard.A1.Flex instances (ARM)
- 4 OCPU (ARM cores) total
- 24GB RAM total
- Can split as: 2x (2 OCPU, 12GB RAM) or 4x (1 OCPU, 6GB RAM)

**Storage**:
- 200GB Block Volume (SSD)

**Network**:
- 10TB outbound transfer/month
- Public IPv4 address

**Database** (optional):
- 2x Autonomous Database (1 OCPU, 20GB each)

#### Why This is the Best Free Option

✅ **Always Free** (not just 12 months)
✅ **Generous Resources** (24GB RAM is huge)
✅ **Enough for Production** (can handle 1K-5K docs/day)
✅ **ARM Architecture** (efficient, modern)

❌ **ARM Compatibility** (some Docker images don't support ARM64)
❌ **Oracle Bureaucracy** (complex signup, credit card required)
❌ **Network Egress Limits** (10TB/month = ~1.3M API calls)

---

#### Architecture on Oracle Cloud Free Tier

```
┌─────────────────────────────────────────────────────────────┐
│ VM 1: Application Stack (ARM64, 2 OCPU, 12GB RAM)          │
├─────────────────────────────────────────────────────────────┤
│ - Docker Compose                                            │
│   - API Gateway (2 replicas)                                │
│   - Document Processor (8 workers)                          │
│   - PostgreSQL (4GB RAM allocated)                          │
│   - Redis (1GB RAM)                                         │
│   - Nginx (reverse proxy + HTTPS)                           │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ VM 2: Observability Stack (ARM64, 2 OCPU, 12GB RAM)        │
├─────────────────────────────────────────────────────────────┤
│ - Prometheus (4GB RAM allocated)                            │
│ - Grafana (2GB RAM)                                         │
│ - Jaeger (optional, 2GB RAM)                                │
│ - Log aggregation (Loki, 2GB RAM)                           │
└─────────────────────────────────────────────────────────────┘

Block Volume: 200GB split 150GB (app) + 50GB (observability)
```

#### Capacity Estimate

**With 2 OCPU, 12GB RAM (VM 1)**:
- **API Gateway**: 2 containers × 400 req/min = 800 req/min
- **Document Processor**: 8 workers × 6 docs/hour = 48 docs/hour = **1,152 docs/day**
- **Database**: PostgreSQL handles 5K-10K docs metadata
- **Redis**: 2GB cache for 1,000 graphs

**Bottleneck**: Still LLM API rate limits, not compute.

---

#### Setup Guide (Oracle Cloud Free Tier)

**Step 1: Sign Up**
```bash
# Go to https://www.oracle.com/cloud/free/
# Sign up (requires credit card, but won't charge)
# Wait for account approval (1-2 days, sometimes instant)
```

**Step 2: Create VM Instance**
```bash
# In Oracle Cloud Console:
# 1. Compute → Instances → Create Instance
# 2. Image: Ubuntu 22.04 (ARM64)
# 3. Shape: VM.Standard.A1.Flex (2 OCPU, 12GB RAM)
# 4. Networking: Create new VCN, public subnet
# 5. Add SSH key
# 6. Create
```

**Step 3: Configure Firewall**
```bash
# In Oracle Cloud Console:
# 1. Networking → Virtual Cloud Networks → Security Lists
# 2. Add Ingress Rule: 0.0.0.0/0 → TCP 80, 443
# 3. Add Ingress Rule: 0.0.0.0/0 → TCP 22 (SSH)

# On VM itself:
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp
sudo ufw enable
```

**Step 4: Install Docker (ARM64)**
```bash
# SSH into VM
ssh ubuntu@<PUBLIC_IP>

# Install Docker (ARM64 compatible)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
newgrp docker

# Install Docker Compose
sudo apt update
sudo apt install docker-compose-plugin -y
```

**Step 5: Deploy Application**
```bash
# Clone your repo
git clone https://github.com/abezr/pdf-summarize.git
cd pdf-summarize

# Create .env file
cat > .env << 'ENVFILE'
DATABASE_URL=postgres://user:pass@postgres:5432/pdfdb
REDIS_URL=redis://redis:6379
OPENAI_API_KEY=sk-...
GOOGLE_AI_API_KEY=...
NODE_ENV=production
ENVFILE

# Build ARM64 images (if not multi-arch)
docker build --platform linux/arm64 -t pdf-summary/api:latest ./api
docker build --platform linux/arm64 -t pdf-summary/worker:latest ./worker

# Deploy with Docker Compose
docker compose up -d

# Verify
docker ps
curl http://localhost:8080/health
```

**Step 6: Configure HTTPS (Let's Encrypt)**
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate (replace example.com with your domain)
sudo certbot --nginx -d example.com -d www.example.com

# Auto-renewal already configured by certbot
sudo certbot renew --dry-run
```

**Cost**: **$0/month** (forever)

---

### Option 2: AWS Free Tier (12 Months)

#### What You Get

**Compute**:
- t2.micro (1 vCPU, 1GB RAM)
- 750 hours/month (= 1 instance running 24/7)
- Linux/Ubuntu

**Storage**:
- 30GB EBS (SSD)

**Database** (optional):
- RDS db.t2.micro (1 vCPU, 1GB RAM, 20GB storage)
- 750 hours/month

**Network**:
- 15GB outbound transfer/month

#### Limitations

❌ **Weak Specs** (1 vCPU, 1GB RAM = can't run full stack)
❌ **12 Month Expiry** (not "always free")
❌ **Low Egress** (15GB/month = ~150K API calls)

#### What You Can Run

**With 1 vCPU, 1GB RAM**:
- API Gateway (1 container, 512MB)
- Worker (1 container, 256MB) → **~10 docs/day max**
- PostgreSQL on RDS (free tier, 1GB RAM)
- Redis: Must use ElastiCache (paid, ~$15/month) OR lightweight alternative

**Verdict**: **NOT sufficient for production**. Good for POC/demo only.

---

### Option 3: Fly.io Free Tier (GOOD FOR SMALL APPS)

#### What You Get

**Compute**:
- 3 shared-CPU VMs (2340 shared-CPU hours/month)
- 3GB RAM total (1GB per VM)

**Storage**:
- 3GB persistent volumes

**Network**:
- 160GB outbound transfer/month

#### Architecture

```
App 1: API Gateway (1 shared-CPU, 1GB RAM)
App 2: Worker (1 shared-CPU, 1GB RAM)
App 3: PostgreSQL (1 shared-CPU, 1GB RAM)
```

#### Capacity

**With 1 shared-CPU, 1GB RAM per service**:
- API: ~200 req/min
- Worker: 2-3 docs/hour = **~60 docs/day**
- PostgreSQL: 1GB RAM (small, but sufficient for metadata)

**Verdict**: **Good for MVP** (50-100 docs/day). Free tier sufficient initially.

**Cost**: **$0/month** (within free tier limits)

---

#### Setup Guide (Fly.io)

```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Login
flyctl auth login

# Create app (API Gateway)
flyctl launch --name pdf-summary-api --region lax

# Deploy
flyctl deploy --config fly.api.toml

# Create PostgreSQL
flyctl postgres create --name pdf-summary-db --region lax --vm-size shared-cpu-1x --volume-size 1

# Attach database to app
flyctl postgres attach pdf-summary-db --app pdf-summary-api

# Create worker app
flyctl launch --name pdf-summary-worker --region lax
flyctl deploy --config fly.worker.toml

# Scale (within free tier: 3GB RAM total)
flyctl scale count 1 --app pdf-summary-api
flyctl scale count 1 --app pdf-summary-worker
flyctl scale vm shared-cpu-1x --memory 1024 --app pdf-summary-api
```

**fly.api.toml** (example):
```toml
app = "pdf-summary-api"
primary_region = "lax"

[build]
  image = "yourusername/pdf-summary-api:latest"

[env]
  NODE_ENV = "production"

[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 0  # Scale to zero when idle
  
[[vm]]
  cpu_kind = "shared"
  cpus = 1
  memory_mb = 1024
```

---

### Option 4: Render Free Tier (HOBBY PROJECTS)

#### What You Get

**Web Services**:
- 750 hours/month (= 1 service running 24/7)
- 512MB RAM
- Spins down after 15 minutes of inactivity (cold start: 30s-2min)

**PostgreSQL**:
- 1GB storage
- Automatically backed up for 7 days
- Expires after 90 days (must upgrade or lose data)

#### Limitations

❌ **Spin Down** (15min inactivity = cold start)
❌ **Weak Specs** (512MB RAM per service)
❌ **Database Expiry** (90 days = data loss risk)
❌ **Cold Starts** (30s-2min = terrible UX)

#### Verdict

**Only for hobby/demo projects**. Not suitable for production.

**Cost**: **$0/month** (within free tier, but with severe limitations)

---

## 3. Cost Comparison: Free vs Paid {#cost-comparison}

### Monthly Cost Comparison (1K docs/day scale)

| Option | Compute | Database | Storage | Egress | **Total** |
|--------|---------|----------|---------|--------|-----------|
| **Oracle Cloud (Free)** | $0 | $0 | $0 | $0 | **$0** ✅ |
| **Fly.io (Free Tier)** | $0 | $0 | $0 | $0 | **$0** ✅ |
| **AWS Free (12mo)** | $0 | $0 | $0 | $0 | **$0** (then $15-30) |
| **Docker Compose (Hetzner)** | €4.15 | - | - | - | **~$4.50** |
| **Docker Compose (DigitalOcean)** | $6 | - | - | - | **$6** |
| **Cloud Run** | $50 | $25 | $5 | $10 | **$90** ❌ |
| **Kubernetes (GKE)** | $280 | - | - | - | **$280** ❌ |

---

### 3-Year TCO: Free vs Paid

#### Scenario 1: Oracle Cloud Always Free (Best Free Option)

| Year | Scale | Infra | Eng Time (0.25 FTE) | Total |
|------|-------|-------|---------------------|-------|
| Year 1 | 0-500 docs/day | $0 | $25K | **$25K** |
| Year 2 | 500-1K docs/day | $0 | $25K | **$25K** |
| Year 3 | 1K-2K docs/day | $0 (still within limits) | $30K (scaling complexity) | **$30K** |
| **TOTAL** | | **$0** | **$80K** | **$80K** |

**Notes**:
- Engineering time HIGHER than Docker Compose ($65K) because Oracle Cloud has quirks
- BUT infrastructure cost is $0 vs $7,680
- Net TCO: $80K vs $73K (Docker Compose) → **Oracle Cloud $7K more expensive due to ARM hassles**

---

#### Scenario 2: Mix Strategy (Start Free, Scale to Paid)

| Phase | Duration | Platform | Infra | Eng Time | Total |
|-------|----------|----------|-------|----------|-------|
| **MVP** | Months 1-6 | Oracle Free | $0 | $12.5K (0.25 FTE) | **$12.5K** |
| **Growth** | Months 7-18 | Hetzner VM ($4.50/mo) | $54 | $15K (0.15 FTE) | **$15.05K** |
| **Scale** | Year 2-3 | Cloud Run | $10.8K | $24K (0.12 FTE) | **$34.8K** |
| **TOTAL** | 3 years | Mixed | **$10.85K** | **$51.5K** | **$62.35K** |

**Best 3-Year TCO**: $62K (14% cheaper than pure Docker Compose, 34% cheaper than pure Cloud Run)

---

## 4. Recommended Strategy: Start Free {#recommended-strategy}

### The Pragmatic Free-Tier Path

```
PHASE 1 (Months 0-3): Proof of Concept
  Platform: Oracle Cloud Always Free
  Scale:    0-200 docs/day
  Cost:     $0/month
  Goal:     Validate product-market fit
  
  OR (if Oracle signup rejected):
  
  Platform: Fly.io Free Tier
  Scale:    0-100 docs/day
  Cost:     $0/month
  Goal:     Validate product-market fit

────────────────────────────────────────────────────────────

PHASE 2 (Months 3-12): Early Growth
  IF still <500 docs/day:
    Platform: Stay on Oracle/Fly.io Free
    Cost:     $0/month
    Action:   Optimize, don't scale yet
  
  IF 500-2K docs/day:
    Platform: Migrate to Hetzner VM (€4.15/mo = $4.50)
    Reason:   More CPU power, x86_64 architecture
    Cost:     $4.50/month
    Setup:    Docker Compose (same as Oracle)

────────────────────────────────────────────────────────────

PHASE 3 (Year 2+): Scale Decision
  IF 2K-5K docs/day, steady traffic:
    Platform: Upgrade Hetzner VM (8 vCPU, 32GB = $40/mo)
    Cost:     $40/month
    Keep:     Docker Compose (simple, works)
  
  IF 5K-20K docs/day, bursty traffic:
    Platform: Migrate to Cloud Run
    Cost:     $200-500/month
    Reason:   Auto-scaling justifies cost
  
  IF >20K docs/day:
    Platform: Consider Kubernetes
    Cost:     $500-2K/month
    Reason:   Complexity now justified
```

---

### Why Start Free Makes Sense

1. **Validate Before Spending**
   - Most MVPs fail (90%)
   - Don't spend $80/month until you have users
   - Oracle/Fly.io free tier = perfect for validation

2. **Learn on Free Tier**
   - Docker Compose skills transferable
   - Debugging on free tier = debugging on paid tier
   - No difference in architecture

3. **Iterate Faster**
   - No cost anxiety = experiment freely
   - Try different LLM providers, prompt strategies
   - Optimize before scaling

4. **Exit Strategy Clear**
   - Oracle Free → Hetzner Paid: Same Docker Compose, new IP
   - Fly.io Free → Cloud Run: Minimal changes (both containers)
   - Migration effort: 4-8 hours

---

### When to Move Off Free Tier

**Trigger 1: Consistent Traffic >500 docs/day**
- Free tier CPU becomes bottleneck
- Response times degrade (>10s)
- → Migrate to Hetzner CX21 ($6/month, 2 vCPU, 4GB)

**Trigger 2: ARM Compatibility Issues**
- Docker images don't support ARM64
- Rebuilding images takes too long
- → Migrate to x86_64 VM (Hetzner, DigitalOcean)

**Trigger 3: Support Needed**
- Oracle Cloud support is poor (free tier = no SLA)
- Production incident, need help fast
- → Migrate to paid provider with support

**Trigger 4: Geographic Latency**
- Free tier limited to specific regions
- Users complaining about latency
- → Migrate to Cloud Run (multi-region support)

**Trigger 5: Compliance/Audit**
- Free tier doesn't meet compliance requirements
- Need SOC 2, HIPAA, etc.
- → Migrate to enterprise cloud provider

---

## 5. Migration Path from Free to Paid {#migration-path}

### Migration 1: Oracle Free → Hetzner Paid

**Effort**: 4-8 hours  
**Downtime**: <5 minutes  
**Reason**: Need more CPU or x86_64 architecture

**Steps**:

```bash
# 1. Provision Hetzner VM
# Go to https://www.hetzner.com/cloud
# Create account, add payment
# Create server: CX21 (2 vCPU, 4GB RAM, €4.15/mo)
# Choose Ubuntu 22.04, add SSH key

# 2. Backup Oracle VM data
# On Oracle VM:
docker compose down
sudo tar -czf /tmp/postgres-backup.tar.gz /var/lib/docker/volumes/postgres-data
sudo tar -czf /tmp/redis-backup.tar.gz /var/lib/docker/volumes/redis-data
scp /tmp/*-backup.tar.gz user@hetzner-vm:/tmp/

# 3. Deploy to Hetzner VM
# On Hetzner VM:
git clone https://github.com/abezr/pdf-summarize.git
cd pdf-summarize
cp /path/to/.env .env

# Restore data
sudo tar -xzf /tmp/postgres-backup.tar.gz -C /
sudo tar -xzf /tmp/redis-backup.tar.gz -C /

# Deploy
docker compose up -d

# 4. Update DNS
# Change A record: example.com → NEW_HETZNER_IP

# 5. Verify
curl https://example.com/health

# 6. Decommission Oracle VM (after 1 week)
# Delete instance in Oracle Cloud Console
```

**Cost**: €4.15/month = $4.50/month (vs $0, but faster and x86_64)

---

### Migration 2: Fly.io Free → Cloud Run

**Effort**: 8-12 hours  
**Downtime**: <2 minutes (with proper strategy)  
**Reason**: Need auto-scaling for bursty traffic

**Steps**:

```bash
# 1. Build & Push Container Images to GCR
# Local machine:
docker build -t gcr.io/YOUR_PROJECT/api:latest ./api
docker build -t gcr.io/YOUR_PROJECT/worker:latest ./worker
docker push gcr.io/YOUR_PROJECT/api:latest
docker push gcr.io/YOUR_PROJECT/worker:latest

# 2. Create Cloud SQL (PostgreSQL)
gcloud sql instances create pdf-summary-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-central1

gcloud sql databases create pdfdb --instance=pdf-summary-db

# 3. Migrate Data from Fly.io Postgres
# On Fly.io:
flyctl postgres connect -a pdf-summary-db
pg_dump pdfdb > /tmp/dump.sql

# On Cloud SQL:
gcloud sql import sql pdf-summary-db gs://YOUR_BUCKET/dump.sql --database=pdfdb

# 4. Deploy to Cloud Run
gcloud run deploy pdf-summary-api \
  --image gcr.io/YOUR_PROJECT/api:latest \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --set-cloudsql-instances YOUR_PROJECT:us-central1:pdf-summary-db \
  --set-env-vars DATABASE_URL=postgres://...

gcloud run deploy pdf-summary-worker \
  --image gcr.io/YOUR_PROJECT/worker:latest \
  --region us-central1 \
  --platform managed \
  --no-allow-unauthenticated \
  --set-cloudsql-instances YOUR_PROJECT:us-central1:pdf-summary-db \
  --set-env-vars DATABASE_URL=postgres://...

# 5. Test Cloud Run Deployment
NEW_URL=$(gcloud run services describe pdf-summary-api --format='value(status.url)')
curl $NEW_URL/health

# 6. Update DNS (gradual cutover)
# Change A record: example.com → Cloud Run IP
# Monitor for 24 hours

# 7. Decommission Fly.io
flyctl apps destroy pdf-summary-api
flyctl apps destroy pdf-summary-worker
flyctl postgres destroy pdf-summary-db
```

**Cost**: $90-200/month (vs $0, but auto-scaling and zero-ops)

---

## Summary Tables

### Free Tier Options: Quick Reference

| Provider | CPU | RAM | Storage | Egress | Duration | Best For |
|----------|-----|-----|---------|--------|----------|----------|
| **Oracle Cloud** | 4 ARM cores | 24GB | 200GB | 10TB | Forever | **Production (free)** ✅ |
| **Fly.io** | 3 shared | 3GB | 3GB | 160GB | Forever | **MVP/Small Apps** ✅ |
| **AWS Free** | 1 vCPU | 1GB | 30GB | 15GB | 12 months | POC only |
| **GCP Free** | 0.25 vCPU | 1GB | 30GB | 1GB | Forever | Not sufficient |
| **Render** | - | 512MB | - | 100GB | Forever | Hobby only |

---

### Cost Progression: As You Scale

| Scale | Platform | Cost/Month | Why |
|-------|----------|------------|-----|
| **0-200 docs/day** | Oracle Free or Fly.io Free | **$0** | Validate product-market fit |
| **200-1K docs/day** | Hetzner CX21 (2 vCPU, 4GB) | **$4.50** | More power, still cheap |
| **1K-3K docs/day** | Hetzner CPX31 (8 vCPU, 16GB) | **$40** | Vertical scaling |
| **3K-10K docs/day** | Cloud Run (auto-scale) | **$200-500** | Auto-scaling justified |
| **>10K docs/day** | Kubernetes (GKE) | **$500-2K** | Complexity justified |

---

### 3-Year TCO: All Strategies

| Strategy | Infra Cost | Eng Cost | **TOTAL** | Notes |
|----------|-----------|----------|-----------|-------|
| **Oracle Free (3 years)** | $0 | $80K | **$80K** | Best if ARM works |
| **Mix (Free→Hetzner→Cloud)** | $10.9K | $51.5K | **$62.4K** | **Best overall** ✅ |
| **Docker Compose (Hetzner)** | $162 | $65K | **$65.2K** | Simple, predictable |
| **Docker Compose (DO)** | $7.7K | $65K | **$72.7K** | Baseline comparison |
| **Cloud Run (3 years)** | $14.4K | $32K | **$46.4K** | If cost not a concern |
| **Kubernetes (3 years)** | $26.4K | $125K | **$151.4K** | Over-engineering ❌ |

---

## Final Recommendation

### For pdf-summarize Project

**PHASE 1 (Months 0-6): Start 100% Free**

```yaml
Platform: Oracle Cloud Always Free (24GB RAM, 4 ARM cores)
OR: Fly.io Free Tier (3GB RAM, 3 shared CPUs)
Cost: $0/month
Capacity: 200-500 docs/day
Setup: 1 day (same Docker Compose as local)
```

**Why**: Validate product-market fit with zero cost. Most MVPs fail—don't spend money until you have users.

---

**PHASE 2 (Months 6-18): Cheap Paid Tier**

```yaml
Platform: Hetzner Cloud CX21 (2 vCPU, 4GB RAM, x86_64)
Cost: $4.50/month
Capacity: 500-2K docs/day
Setup: 4 hours (migrate from Oracle/Fly.io)
```

**Why**: Proven demand, need more power. $4.50/month is negligible cost for a working product.

---

**PHASE 3 (Year 2+): Scale as Needed**

```yaml
IF steady 2K-5K docs/day:
  Platform: Hetzner CPX31 (8 vCPU, 16GB RAM)
  Cost: $40/month

IF bursty 5K-20K docs/day:
  Platform: Cloud Run (auto-scaling)
  Cost: $200-500/month
```

---

### Why This Beats Pure Cloud Run

| Aspect | Start Free Strategy | Pure Cloud Run |
|--------|---------------------|----------------|
| **Months 0-6 Cost** | $0 | $600 ($100/mo) |
| **Learn Cloud Run?** | No, learn Docker (portable) | Yes (GCP lock-in) |
| **Validation Risk** | Zero cost if pivot | $600 wasted |
| **Migration Path** | Clear (Free→Paid→Cloud) | Stuck on Cloud Run |
| **3-Year TCO** | $62K (mix) | $46K (pure Cloud Run) |

**Cloud Run wins on pure TCO** ($46K vs $62K) **IF you know the product will succeed**.

**Start Free wins on risk-adjusted ROI** because most MVPs fail—don't spend until validated.

---

### The Winning Formula

```
1. Start on Oracle Cloud Always Free (0-6 months, $0)
2. Migrate to Hetzner when needed (7-18 months, $4.50-40/mo)
3. Scale to Cloud Run when bursty (Year 2+, $200-500/mo)
4. Consider K8s only if >10K docs/day (Year 3+, $500+/mo)

Total savings vs pure Cloud Run: $14K over 3 years
Risk mitigation: $0 spent if product fails in first 6 months
```

**Bottom line**: Cloud Run has the best TCO **for a successful product**, but **start free** to de-risk the journey. You'll save $14K and avoid wasting money on a failed MVP.

---

## Resources

- **Oracle Cloud Free Tier**: https://www.oracle.com/cloud/free/
- **Fly.io Pricing**: https://fly.io/docs/about/pricing/
- **Hetzner Cloud**: https://www.hetzner.com/cloud
- **This Project**: https://github.com/abezr/pdf-summarize

---

**Remember**: The best architecture is the one you can afford to maintain. Start free, scale smart, spend only when justified.

