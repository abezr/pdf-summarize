# Free-Tier Traffic Limits: Oracle vs GCP Deep Dive

**Project**: pdf-summarize  
**Repository**: https://github.com/abezr/pdf-summarize  
**Date**: 2025-11-30  
**Version**: 1.0.0

---

## Executive Summary

### TL;DR: Traffic Limits Comparison

| Traffic Type | Oracle Cloud Always Free | GCP Always Free | Winner |
|-------------|-------------------------|----------------|--------|
| **Egress (Outbound)** | 10TB/month | 1GB/month (US), 200GB (China/Australia) | **Oracle** (10,000x more for US) |
| **Ingress (Inbound)** | Unlimited | Unlimited | Tie |
| **Requests/Month (VM)** | Unlimited | Unlimited | Tie |
| **Cloud Run Requests** | N/A | 2M requests/month | **GCP** ✅ |
| **Cloud Functions Invocations** | N/A | 2M invocations/month | **GCP** ✅ |
| **Cloud Storage Operations** | 50K read, 50K write | 5K Class A, 50K Class B | **Oracle** ✅ |
| **Database Queries** | Unlimited (2x 20GB DBs) | N/A (free DB ended 2024) | **Oracle** ✅ |

**Key Insight**: **Oracle dominates on egress (10TB vs 1GB = 10,000x more)**, making it ideal for serving large files. **GCP wins on serverless request limits** (2M req/month), ideal for API-heavy workloads.

---

## Table of Contents

1. [Network Traffic Limits (Egress/Ingress)](#network-traffic)
2. [Request Rate Limits](#request-limits)
3. [Storage Traffic Limits](#storage-traffic)
4. [Database Traffic Limits](#database-traffic)
5. [Serverless Traffic Limits](#serverless-traffic)
6. [Real-World Capacity Analysis](#capacity-analysis)
7. [Traffic Cost Breakdown (When Exceeding Free Tier)](#cost-breakdown)
8. [Recommended Strategy by Traffic Pattern](#strategy)

---

## 1. Network Traffic Limits (Egress/Ingress) {#network-traffic}

### Oracle Cloud Always Free

| Metric | Limit | Notes |
|--------|-------|-------|
| **Egress (Outbound)** | 10TB/month | Per account (not per VM) |
| **Ingress (Inbound)** | Unlimited | Free forever |
| **Inter-Region Traffic** | Counted as egress | Within 10TB limit |
| **Intra-Region Traffic** | Unlimited | Between VMs in same region = free |

**Key Points**:
- ✅ 10TB egress = **333GB/day** or **13.9GB/hour**
- ✅ Sufficient for serving **~200,000 PDFs/month** (50MB each)
- ✅ Enough for **~6,666 PDFs/day**
- ⚠️ After 10TB, charged at **$0.0085/GB** ($8.50/TB)

---

### GCP Always Free

| Metric | Limit | Notes |
|--------|-------|-------|
| **Egress (Outbound)** | 1GB/month (US destinations) | Per account |
| | 200GB/month (China/Australia) | Premium tier only |
| **Ingress (Inbound)** | Unlimited | Free forever |
| **Inter-Region Traffic** | Charged (no free tier) | $0.01-0.12/GB |
| **Intra-Region Traffic** | Unlimited | Within same zone = free |

**Key Points**:
- ⚠️ 1GB egress = **33MB/day** or **1.4MB/hour**
- ⚠️ Sufficient for serving **~20 PDFs/month** (50MB each)
- ⚠️ NOT enough for production workloads
- ⚠️ After 1GB, charged at **$0.12/GB** ($120/TB) — 14x more expensive than Oracle

**Special Case**: Cloud Run and App Engine have separate egress limits (1GB/month each), so total free egress = 3GB/month if using all services.

---

### Comparison: Egress Limits

| Destination | Oracle Cloud | GCP e2-micro | GCP Cloud Run |
|------------|-------------|--------------|---------------|
| **US (same region)** | Unlimited (intra-region) | Unlimited (intra-zone) | Unlimited (intra-region) |
| **US (different region)** | 10TB/month | 1GB/month | 1GB/month |
| **International** | 10TB/month | 1GB/month | 1GB/month |

**Verdict**: **Oracle wins by 10,000x** for cross-region/international traffic.

---

## 2. Request Rate Limits {#request-limits}

### Oracle Cloud Always Free

**VM-Based Services** (running on 2x VM.Standard.A1.Flex):

| Metric | Estimate | Notes |
|--------|----------|-------|
| **HTTP Requests/sec** | ~2,000 req/s | Limited by VM CPU/RAM, not platform |
| **HTTP Requests/month** | ~5.2 billion | 2,000 req/s × 2.6M seconds/month |
| **Concurrent Connections** | ~10,000 | Depends on RAM (24GB total) |
| **Network Throughput** | ~10 Gbps | Limited by VM network cap |

**Key Points**:
- ✅ No platform-imposed request limits (only VM capacity)
- ✅ Can handle **2M req/month easily** (0.04% of capacity)
- ✅ Bottleneck: egress bandwidth (10TB/month) not requests

---

### GCP Always Free

**e2-micro VM**:

| Metric | Estimate | Notes |
|--------|----------|-------|
| **HTTP Requests/sec** | ~50 req/s | Limited by 0.25 vCPU + 1GB RAM |
| **HTTP Requests/month** | ~130M | 50 req/s × 2.6M seconds/month |
| **Concurrent Connections** | ~100 | Limited by 1GB RAM |
| **Network Throughput** | ~200 Mbps | Limited by VM network cap |

**Cloud Run (Serverless)**:

| Metric | Free Tier | Notes |
|--------|-----------|-------|
| **HTTP Requests/month** | 2M requests | Hard limit, then charged |
| **Concurrent Requests** | Up to 1,000 | Auto-scaling |
| **Requests/sec** | Unlimited | Scales to millions (within 2M/month) |
| **CPU Time** | 360K vCPU-seconds | ~100 hours of CPU time |
| **Memory Time** | 360K GiB-seconds | ~100 hours with 1GB RAM |

**Key Points**:
- ✅ Cloud Run 2M req/month = **~770 req/hour** or **~12 req/min**
- ✅ Perfect for lightweight API gateway (auth, routing)
- ⚠️ NOT suitable for compute-heavy workloads (360K vCPU-seconds = 100 hours)
- ⚠️ After 2M requests, charged at **$0.40 per million requests**

---

### Comparison: Request Capacity

| Service | Requests/Month | Requests/Day | Requests/Hour | Use Case |
|---------|---------------|--------------|---------------|----------|
| **Oracle VM (free)** | ~5.2 billion | ~170M | ~7M | Heavy compute, unlimited requests |
| **GCP e2-micro (free)** | ~130M | ~4.3M | ~180K | Light API, limited by RAM |
| **GCP Cloud Run (free)** | 2M | 66K | 2,700 | Lightweight API, bursty traffic |

**Verdict**: 
- **Oracle wins for total capacity** (unlimited requests within egress limits)
- **GCP Cloud Run wins for serverless simplicity** (2M requests for $0)

---

## 3. Storage Traffic Limits {#storage-traffic}

### Oracle Cloud Object Storage

**Always Free Tier**:

| Metric | Limit | Notes |
|--------|-------|-------|
| **Storage Capacity** | 20GB (10GB std + 10GB archive) | Forever free |
| **Egress (Downloads)** | Within 10TB/month (shared with VM) | No separate limit |
| **API Requests (Read)** | 50K/month | GET, HEAD, LIST operations |
| **API Requests (Write)** | 50K/month | PUT, POST, DELETE operations |
| **Throughput** | Unlimited | No throttling on free tier |

**Key Points**:
- ✅ 50K reads/month = **1,666 reads/day** or **69 reads/hour**
- ✅ 50K writes/month = **1,666 writes/day**
- ✅ Sufficient for **~1,600 PDF uploads/month** (assuming 1 write per upload)
- ⚠️ After 50K operations, charged at **$0.04 per 10K requests**

---

### GCP Cloud Storage

**Always Free Tier**:

| Metric | Limit | Notes |
|--------|-------|-------|
| **Storage Capacity** | 5GB (Regional, US regions only) | Forever free |
| **Egress (Downloads)** | 1GB/month (shared with VM) | To US destinations |
| **API Requests (Class A)** | 5K/month | Write, list operations |
| **API Requests (Class B)** | 50K/month | Read operations |
| **Throughput** | Unlimited | No throttling |

**Key Points**:
- ⚠️ 5K writes/month = **166 writes/day** or **7 writes/hour**
- ✅ 50K reads/month = **1,666 reads/day** or **69 reads/hour**
- ⚠️ Only **~166 PDF uploads/month** (5K Class A operations)
- ⚠️ After 5K writes, charged at **$0.05 per 10K requests** (25% more than Oracle)

---

### Comparison: Storage Operations

| Metric | Oracle Object Storage | GCP Cloud Storage | Winner |
|--------|----------------------|-------------------|--------|
| **Storage** | 20GB | 5GB | **Oracle** (4x more) |
| **Read Operations** | 50K/month | 50K/month | Tie |
| **Write Operations** | 50K/month | 5K/month | **Oracle** (10x more) |
| **Egress** | 10TB/month | 1GB/month | **Oracle** (10,000x more) |

**Verdict**: **Oracle wins on storage traffic** — 10x more write operations, 4x more storage, 10,000x more egress.

---

## 4. Database Traffic Limits {#database-traffic}

### Oracle Autonomous Database (Always Free)

**Resources**:
- 2x Autonomous Database (1 OCPU, 20GB each)
- Total: 2 OCPU, 40GB storage

| Metric | Limit | Notes |
|--------|-------|-------|
| **Queries/sec** | ~500-1K queries/sec | Depends on query complexity |
| **Concurrent Connections** | 300 | Hard limit per database |
| **Storage** | 40GB total (20GB × 2 DBs) | Forever free |
| **IOPS** | ~15K IOPS | Shared OCPU capacity |
| **Network Throughput** | ~1 Gbps | Limited by OCPU |
| **Backup Storage** | Included | Automatic backups |

**Key Points**:
- ✅ 500 queries/sec = **1.3 billion queries/month**
- ✅ Sufficient for **millions of documents** in metadata DB
- ✅ No separate traffic charges (within 10TB egress)
- ✅ Oracle SQL, PostgreSQL, or JSON document modes

---

### GCP Free Tier (Database)

**⚠️ GCP Cloud SQL Free Tier ENDED in 2024**

Previously offered:
- ~~1x db-f1-micro (0.6 GB RAM, 3 TB egress)~~ — **NO LONGER FREE**

**Current Options**:
1. **Firestore (NoSQL)**: 1GB storage, 50K reads/day, 20K writes/day (forever free)
2. **Self-hosted on e2-micro**: PostgreSQL on 1GB RAM VM (limited performance)
3. **Cloud SQL (Paid)**: Minimum ~$10/month for db-f1-micro

**Firestore Limits** (Always Free):

| Metric | Limit | Notes |
|--------|-------|-------|
| **Storage** | 1GB | Forever free |
| **Document Reads** | 50K/day (1.5M/month) | Read operations |
| **Document Writes** | 20K/day (600K/month) | Write operations |
| **Document Deletes** | 20K/day (600K/month) | Delete operations |
| **Egress** | 10GB/month | Network bandwidth |

**Key Points**:
- ⚠️ 50K reads/day = **2K reads/hour** or **34 reads/min**
- ⚠️ 20K writes/day = **833 writes/hour** or **14 writes/min**
- ⚠️ Sufficient for **~20K documents/month** (1 write per doc)
- ⚠️ NoSQL only (not SQL-compatible)

---

### Comparison: Database Traffic

| Metric | Oracle Autonomous DB | GCP Firestore | Winner |
|--------|---------------------|---------------|--------|
| **Storage** | 40GB | 1GB | **Oracle** (40x more) |
| **Reads/Month** | ~1.3B queries | 1.5M reads | **Oracle** (867x more) |
| **Writes/Month** | ~1.3B queries | 600K writes | **Oracle** (2,167x more) |
| **SQL Support** | ✅ Yes (Oracle SQL, PostgreSQL) | ❌ No (NoSQL only) | **Oracle** ✅ |
| **Concurrent Connections** | 300 | Unlimited (serverless) | **GCP** ✅ |

**Verdict**: **Oracle wins massively** — 867x more read capacity, 40x more storage, full SQL support.

---

## 5. Serverless Traffic Limits {#serverless-traffic}

### Oracle Cloud (No Serverless Free Tier)

Oracle does **NOT** offer serverless functions in free tier. Must use VM-based services.

---

### GCP Serverless (Always Free)

#### Cloud Run

| Metric | Free Tier | Notes |
|--------|-----------|-------|
| **Requests** | 2M requests/month | HTTP/gRPC requests |
| **CPU Time** | 360K vCPU-seconds | ~100 hours |
| **Memory Time** | 360K GiB-seconds | ~100 hours with 1GB RAM |
| **Egress** | 1GB/month | Network bandwidth |
| **Concurrency** | Up to 1,000 instances | Auto-scaling |
| **Cold Starts** | ~1-2 seconds | First request latency |

**Capacity Estimate**:
- 2M requests/month = **66K requests/day** or **2,700 requests/hour**
- 360K vCPU-seconds = enough for **1,000 docs/month** (assuming 6 minutes/doc processing)
- ⚠️ NOT suitable for compute-heavy workloads (CPU time limit is tight)

---

#### Cloud Functions

| Metric | Free Tier | Notes |
|--------|-----------|-------|
| **Invocations** | 2M invocations/month | Function calls |
| **CPU Time** | 400K GHz-seconds | ~111 hours at 1 GHz |
| **Memory Time** | 400K GB-seconds | ~111 hours with 1GB RAM |
| **Egress** | 5GB/month | Network bandwidth |
| **Concurrency** | 1,000 instances | Per function |

**Capacity Estimate**:
- 2M invocations/month = **66K invocations/day**
- 400K GB-seconds = enough for **~1,100 docs/month** (assuming 6 minutes/doc)
- ✅ Good for webhooks, async tasks (not compute-heavy)

---

### Comparison: Serverless Traffic

| Metric | Oracle (VM-based) | GCP Cloud Run | GCP Cloud Functions |
|--------|------------------|---------------|-------------------|
| **Requests/Month** | Unlimited | 2M | 2M |
| **CPU Time** | Unlimited | 360K vCPU-s (~100h) | 400K GHz-s (~111h) |
| **Memory** | 24GB (always on) | 360K GiB-s (~100h @ 1GB) | 400K GB-s (~111h @ 1GB) |
| **Egress** | 10TB/month | 1GB/month | 5GB/month |
| **Cold Starts** | None (always on) | ~1-2s | ~1-3s |
| **Use Case** | Heavy compute | Lightweight API | Async tasks |

**Verdict**: 
- **Oracle wins for compute-heavy workloads** (24GB RAM always on, unlimited CPU time)
- **GCP wins for bursty, lightweight APIs** (serverless simplicity, 2M req/month)

---

## 6. Real-World Capacity Analysis {#capacity-analysis}

### Scenario 1: PDF Summarization (pdf-summarize project)

**Workload**:
- Upload 50MB PDF
- Process 5-stage pipeline (extract, chunk, summarize, graph, export)
- Average processing: 6 minutes/doc
- Serve result (5MB summary) to user

#### Oracle Cloud Always Free

**Traffic Profile**:
- Ingress: 50MB × 2,000 docs/month = **100GB/month** (unlimited, free)
- Egress: 5MB × 2,000 docs/month = **10GB/month** (within 10TB limit)
- Storage writes: 1 write/doc = **2,000 writes/month** (within 50K limit)
- Storage reads: 10 reads/doc = **20,000 reads/month** (within 50K limit)
- DB queries: 100 queries/doc = **200K queries/month** (within 1.3B limit)

**Capacity**: **2,000 docs/month (66 docs/day)** — bottleneck is CPU time, not traffic.

**Cost**: **$0/month** ✅

---

#### GCP Always Free (e2-micro only)

**Traffic Profile**:
- Ingress: 50MB × 40 docs/month = **2GB/month** (unlimited, free)
- Egress: 5MB × 40 docs/month = **0.2GB/month** (within 1GB limit)
- Storage writes: 1 write/doc = **40 writes/month** (within 5K limit)
- Storage reads: 10 reads/doc = **400 reads/month** (within 50K limit)
- Firestore writes: 100 writes/doc = **4,000 writes/day** (within 20K/day limit)

**Capacity**: **40 docs/month (1.3 docs/day)** — bottleneck is RAM (1GB), not traffic.

**Cost**: **$0/month** ✅

---

#### GCP Multi-Service (e2-micro + Cloud Run + Firestore)

**Traffic Profile**:
- Cloud Run API: 100 requests/doc × 2K docs = **200K requests/month** (within 2M limit)
- Ingress (Cloud Storage): 50MB × 2K docs = **100GB/month** (unlimited, free)
- Egress (Cloud Run): 5MB × 2K docs = **10GB/month** ❌ (exceeds 1GB limit, charge ~$1.08)
- Storage writes: 1 write/doc = **2K writes/month** (within 5K limit)
- Firestore writes: 100 writes/doc × 2K docs = **200K writes/month** ❌ (exceeds 600K/month, charge ~$0.18)

**Capacity**: **2,000 docs/month** — but exceeds egress limit.

**Cost**: **~$1.26/month** (egress $1.08 + Firestore $0.18)

---

### Scenario 2: API-Heavy SaaS (many small requests)

**Workload**:
- 100K API requests/day
- Small payloads (10KB request, 5KB response)
- No heavy compute (just database queries)

#### Oracle Cloud Always Free

**Traffic Profile**:
- Ingress: 10KB × 100K × 30 = **30GB/month** (unlimited, free)
- Egress: 5KB × 100K × 30 = **15GB/month** (within 10TB limit)
- API Requests: **3M requests/month** (unlimited, VM-based)
- DB Queries: 10 queries/request × 3M = **30M queries/month** (within 1.3B limit)

**Capacity**: **3M requests/month (100K/day)** ✅

**Cost**: **$0/month** ✅

---

#### GCP Cloud Run (Always Free)

**Traffic Profile**:
- Ingress: 10KB × 100K × 30 = **30GB/month** (unlimited, free)
- Egress: 5KB × 100K × 30 = **15GB/month** ❌ (exceeds 1GB limit, charge ~$1.68)
- API Requests: **3M requests/month** ❌ (exceeds 2M limit, charge ~$0.40)
- Firestore queries: 10 reads/request × 3M = **30M reads/month** ❌ (exceeds 1.5M/month, charge ~$1.05)

**Capacity**: **3M requests/month** — but exceeds multiple limits.

**Cost**: **~$3.13/month** (egress $1.68 + requests $0.40 + Firestore $1.05)

**Verdict**: Oracle significantly cheaper for API-heavy workloads.

---

### Scenario 3: File Hosting (static files)

**Workload**:
- Serve 10MB files (images, videos, documents)
- 1,000 downloads/day

#### Oracle Cloud Always Free

**Traffic Profile**:
- Egress: 10MB × 1K × 30 = **300GB/month** (within 10TB limit)
- Storage reads: **30K reads/month** (within 50K limit)

**Capacity**: **30K downloads/month (1K/day)** ✅

**Cost**: **$0/month** ✅

---

#### GCP Cloud Storage (Always Free)

**Traffic Profile**:
- Egress: 10MB × 1K × 30 = **300GB/month** ❌ (exceeds 1GB, charge ~$35.88)
- Storage reads (Class B): **30K reads/month** (within 50K limit)

**Capacity**: **30K downloads/month** — but massive egress charges.

**Cost**: **~$35.88/month** (egress $35.88)

**Verdict**: Oracle 300x cheaper for file hosting.

---

## 7. Traffic Cost Breakdown (When Exceeding Free Tier) {#cost-breakdown}

### Egress Cost Comparison

| Egress Volume | Oracle Cloud | GCP | AWS | Winner |
|--------------|-------------|-----|-----|--------|
| **First 1GB** | Free (within 10TB) | Free | $0.09 | Oracle/GCP |
| **First 10GB** | Free (within 10TB) | **$1.08** | $0.90 | **Oracle** |
| **100GB** | Free (within 10TB) | **$11.88** | $9 | **Oracle** |
| **1TB** | Free (within 10TB) | **$122.88** | $92.16 | **Oracle** |
| **10TB** | Free | **$1,228.80** | $921.60 | **Oracle** |
| **11TB** | **$8.50** | **$1,351.68** | $1,013.76 | **Oracle** |
| **100TB** | **$765** | **$12,288** | $9,216 | **Oracle** |

**Pricing**:
- Oracle: First 10TB free, then **$0.0085/GB**
- GCP: First 1GB free, then **$0.12/GB** (US destinations)
- AWS: First 1GB $0.09/GB, then tiered (cheaper at scale)

**Verdict**: **Oracle wins massively** — 10TB free tier vs 1GB, and 14x cheaper after ($0.0085 vs $0.12/GB).

---

### Request Cost Comparison (Serverless)

| Requests | Oracle (VM) | GCP Cloud Run | AWS Lambda | Winner |
|----------|------------|---------------|------------|--------|
| **First 2M** | Free (unlimited) | Free | $0.20 | **Oracle/GCP** |
| **10M** | Free (unlimited) | **$3.20** | $1 | **Oracle** |
| **100M** | Free (unlimited) | **$39.20** | $10 | **Oracle** |
| **1B** | Free (unlimited) | **$399.20** | $100 | **Oracle** |

**Pricing**:
- Oracle (VM-based): No per-request charges (included in VM cost)
- GCP Cloud Run: First 2M free, then **$0.40 per million requests**
- AWS Lambda: First 1M free, then **$0.20 per million requests**

**Verdict**: **Oracle wins for high-traffic APIs** (no per-request charges).

---

### Storage Operations Cost Comparison

| Operations | Oracle Object Storage | GCP Cloud Storage | AWS S3 | Winner |
|------------|----------------------|-------------------|--------|--------|
| **First 50K reads** | Free | Free (50K Class B) | Free (2K GET) | **Oracle/GCP** |
| **100K reads** | **$0.20** | Free (within 50K) | **$0.04** | **AWS** |
| **1M reads** | **$3.80** | **$4** | **$0.40** | **AWS** |
| **First 5K writes** | Free (within 50K) | Free | Free (2K PUT) | Tie |
| **50K writes** | Free | **$0.225** | **$0.24** | **Oracle** |
| **100K writes** | **$0.20** | **$0.475** | **$0.50** | **Oracle** |

**Pricing**:
- Oracle: First 50K reads/writes free, then **$0.04 per 10K requests**
- GCP: 5K Class A (writes) free, 50K Class B (reads) free, then **$0.05 per 10K Class A**, **$0.004 per 10K Class B**
- AWS S3: 2K GET/PUT free, then **$0.0004 per 1K GET**, **$0.005 per 1K PUT**

**Verdict**: 
- **AWS wins for ultra-high-volume reads** ($0.004 per 10K vs $0.40)
- **Oracle wins for writes** (50K free vs 5K on GCP)

---

## 8. Recommended Strategy by Traffic Pattern {#strategy}

### Pattern 1: File Serving (High Egress)

**Characteristics**:
- Serve large files (PDFs, videos, images)
- High egress (>100GB/month)
- Low compute

**Recommendation**: **Oracle Cloud** ✅

**Why**:
- 10TB free egress vs 1GB on GCP (10,000x more)
- After 10TB, $0.0085/GB (14x cheaper than GCP)
- 20GB object storage (4x more than GCP)

**Architecture**:
```
Oracle Cloud:
  - Object Storage: 20GB for files
  - VM (6GB RAM): Nginx static file server
  - Egress: 10TB/month free
```

**Cost**: **$0/month** for up to 10TB egress

---

### Pattern 2: API-Heavy (High Request Volume)

**Characteristics**:
- Many small API requests (>2M/month)
- Low compute per request (<100ms)
- Low egress (<1GB/month)

**Recommendation**: **GCP Cloud Run** ✅

**Why**:
- 2M requests/month free (serverless)
- Auto-scaling 0-1000 instances
- No cold start penalty (within free tier)

**Architecture**:
```
GCP Cloud Run:
  - API Gateway (serverless)
  - 2M requests/month free
  - Auto-scaling
  - HTTPS, load balancing included
```

**Cost**: **$0/month** for up to 2M requests

**When to switch to Oracle**: If >2M requests/month AND compute-heavy (use Oracle VM for unlimited requests).

---

### Pattern 3: Compute-Heavy (Long Processing)

**Characteristics**:
- CPU-intensive tasks (ML, video encoding, PDF processing)
- Long processing times (>5 minutes/task)
- Moderate egress (<1TB/month)

**Recommendation**: **Oracle Cloud** ✅

**Why**:
- 24GB RAM (vs 1GB on GCP e2-micro)
- 4 ARM cores (vs 0.25 vCPU on GCP)
- Unlimited CPU time (vs 360K vCPU-seconds on Cloud Run)
- No cold starts (always on)

**Architecture**:
```
Oracle Cloud:
  - VM1: 16 worker processes (12GB RAM)
  - VM2: PostgreSQL + Redis + monitoring (12GB RAM)
  - 24GB total RAM
  - Unlimited CPU time
```

**Cost**: **$0/month** for up to 2K docs/day

---

### Pattern 4: Database-Heavy (High Query Volume)

**Characteristics**:
- Many database queries (>1M/month)
- SQL required (complex joins, transactions)
- Moderate storage (<40GB)

**Recommendation**: **Oracle Autonomous DB** ✅

**Why**:
- 2x Autonomous DB (1 OCPU, 20GB each) = 40GB total
- Full SQL support (Oracle SQL, PostgreSQL modes)
- ~1.3 billion queries/month capacity
- Free backups

**Architecture**:
```
Oracle Cloud:
  - 2x Autonomous DB (40GB total)
  - 300 concurrent connections per DB
  - ~500-1K queries/sec
  - Automatic backups
```

**Cost**: **$0/month** for up to 1.3B queries/month

**When to use GCP**: If NoSQL is sufficient (Firestore: 1.5M reads/month, 600K writes/month free).

---

### Pattern 5: Hybrid (Oracle + GCP Multi-Cloud)

**Characteristics**:
- Compute-heavy workers + lightweight API
- High egress + high request volume
- Need serverless simplicity + compute power

**Recommendation**: **Oracle Workers + GCP Cloud Run API** ✅

**Why**:
- Oracle: Heavy lifting (24GB RAM, unlimited CPU time, 10TB egress)
- GCP Cloud Run: API gateway (2M requests/month, auto-scaling)
- Best of both worlds

**Architecture**:
```
GCP Cloud Run (API):
  - Receive requests (2M/month free)
  - Auth, validation, routing
  - Forward to Oracle workers

Oracle Cloud (Workers):
  - 16 workers (24GB RAM)
  - PostgreSQL (4GB RAM)
  - Process documents
  - Serve results (10TB egress free)
```

**Cost**: **$0/month** for up to 2M requests + 2K docs/day

**Traffic Breakdown**:
- Ingress (GCP): Unlimited (free)
- Egress (Oracle): 10TB/month (free)
- API requests (GCP Cloud Run): 2M/month (free)
- Compute (Oracle): Unlimited (free)

---

## Summary Tables

### Traffic Limits: Quick Reference

| Limit Type | Oracle Always Free | GCP Always Free | Winner |
|-----------|-------------------|----------------|--------|
| **Egress** | 10TB/month | 1GB/month | **Oracle** (10,000x) |
| **Ingress** | Unlimited | Unlimited | Tie |
| **API Requests** | Unlimited (VM) | 2M/month (Cloud Run) | **Oracle** (capacity) |
| **Storage Reads** | 50K/month | 50K/month | Tie |
| **Storage Writes** | 50K/month | 5K/month | **Oracle** (10x) |
| **DB Queries** | ~1.3B/month | 1.5M reads/month (Firestore) | **Oracle** (867x) |
| **Serverless CPU** | N/A | 360K vCPU-seconds | **GCP** ✅ |

---

### Cost After Exceeding Free Tier

| Service | Overage Cost | Oracle | GCP | Winner |
|---------|-------------|--------|-----|--------|
| **Egress (per TB)** | After free tier | **$8.50** | $122.88 | **Oracle** (14x cheaper) |
| **API Requests (per 1M)** | After free tier | **$0** (VM) | $0.40 | **Oracle** |
| **Storage Reads (per 10K)** | After free tier | **$0.04** | $0.04 | Tie |
| **Storage Writes (per 10K)** | After free tier | **$0.04** | $0.05 | **Oracle** |

---

### Capacity by Workload Type

| Workload | Oracle Free Tier | GCP Free Tier (Multi-Service) | Winner |
|----------|-----------------|------------------------------|--------|
| **PDF Processing** | 2,000 docs/month | 2,000 docs/month (with $1.26 overage) | **Oracle** |
| **API SaaS** | 3M requests/month | 2M requests/month | **Oracle** |
| **File Hosting** | 1,000 downloads/day (10MB each) | 3 downloads/day (10MB each) | **Oracle** (333x) |
| **Static Website** | 10TB/month bandwidth | 1GB/month bandwidth | **Oracle** (10,000x) |

---

## Final Recommendations

### For pdf-summarize Project

**Traffic Profile**:
- Ingress: 50MB/doc × 2K docs = 100GB/month
- Egress: 5MB/doc × 2K docs = 10GB/month
- API requests: 100 req/doc × 2K = 200K/month
- DB queries: 100 queries/doc × 2K = 200K/month

**Recommendation**: **Oracle Cloud Only** ✅

**Why**:
- 100GB ingress: ✅ Unlimited on both platforms
- 10GB egress: ✅ Free on Oracle (within 10TB), would be $1.08 on GCP
- 200K API requests: ✅ Unlimited on Oracle VM, free on GCP Cloud Run (within 2M)
- 200K DB queries: ✅ Free on Oracle (within 1.3B), would require paid Cloud SQL on GCP

**Cost**: **$0/month** on Oracle, **~$1/month** on GCP (egress charges)

---

### When to Use Multi-Cloud

Use **Oracle + GCP** when:
1. ✅ You need >10TB egress (use Oracle) AND >2M serverless requests (use GCP)
2. ✅ You want geographic distribution (Oracle US + UK + GCP Asia)
3. ✅ You have hybrid workload (compute workers on Oracle + serverless API on GCP)

**Cost**: **$0/month** if staying within both free tiers

**Overhead**: +40% engineering time (manage 2 clouds)

---

## Bottom Line

**Oracle Cloud dominates on traffic limits**:
- ✅ 10,000x more egress (10TB vs 1GB)
- ✅ 10x more storage writes (50K vs 5K)
- ✅ 867x more database queries (1.3B vs 1.5M)
- ✅ 14x cheaper egress after free tier ($8.50/TB vs $122.88/TB)

**GCP wins on serverless request limits**:
- ✅ 2M serverless requests/month (Cloud Run)
- ✅ Auto-scaling (0-1000 instances)
- ✅ No cold starts (within free tier)

**Best strategy**: 
- **High egress? → Oracle**
- **High API requests (serverless)? → GCP Cloud Run**
- **Compute-heavy? → Oracle**
- **Both? → Oracle workers + GCP Cloud Run API**

For **pdf-summarize**: **Oracle Cloud Only** (simple, sufficient, $0/month).

---

## Resources

- **Oracle Cloud Free Tier**: https://www.oracle.com/cloud/free/
- **GCP Free Tier**: https://cloud.google.com/free
- **GCP Pricing Calculator**: https://cloud.google.com/products/calculator
- **Oracle Cloud Pricing**: https://www.oracle.com/cloud/price-list/
- **This Project**: https://github.com/abezr/pdf-summarize

---

**Remember**: Traffic limits are often the hidden bottleneck. Plan for 10x growth when choosing a platform.
