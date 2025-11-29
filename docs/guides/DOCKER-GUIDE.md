# Docker Deployment Guide

Complete guide for deploying PDF Summary AI using Docker and Docker Compose.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Development Environment](#development-environment)
3. [Production Environment](#production-environment)
4. [Docker Compose Files](#docker-compose-files)
5. [Environment Configuration](#environment-configuration)
6. [Service Management](#service-management)
7. [Scaling & Load Balancing](#scaling--load-balancing)
8. [Backup & Restore](#backup--restore)
9. [Monitoring & Logs](#monitoring--logs)
10. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Prerequisites

- Docker 24.0+ installed
- Docker Compose 2.20+ installed
- At least 4GB RAM available
- At least 10GB disk space

### 1-Minute Setup

```bash
# Clone repository
git clone https://github.com/abezr/pdf-summarize.git
cd pdf-summarize

# Configure environment
cp .env.example .env
# Edit .env and add at least one API key (OPENAI_API_KEY or GOOGLE_API_KEY)

# Start development environment
./scripts/docker-dev.sh up

# Access application
# http://localhost:3001
```

---

## Development Environment

### Start Development Services

```bash
# Basic services (app, postgres, redis)
./scripts/docker-dev.sh up

# With observability (includes prometheus, grafana)
./scripts/docker-dev.sh up-full
```

### Service URLs

- **Application**: http://localhost:3001
- **PostgreSQL**: localhost:5432 (user: pdfai, password: pdfai_dev)
- **Redis**: localhost:6379
- **Grafana**: http://localhost:3000 (admin/admin) - with `up-full`
- **Prometheus**: http://localhost:9090 - with `up-full`

### Hot Reload

The development environment supports hot reload:
- Source code changes in `src/` are automatically detected
- No need to rebuild or restart containers
- Debugger port available on 9229

### Common Development Commands

```bash
# View logs
./scripts/docker-dev.sh logs          # All services
./scripts/docker-dev.sh logs app      # Just application

# Open shell in container
./scripts/docker-dev.sh shell         # App container
./scripts/docker-dev.sh shell postgres

# Database access
./scripts/docker-dev.sh db            # PostgreSQL CLI

# Redis access
./scripts/docker-dev.sh redis-cli     # Redis CLI

# Restart services
./scripts/docker-dev.sh restart

# Stop services
./scripts/docker-dev.sh down

# Rebuild application image
./scripts/docker-dev.sh rebuild

# Clean everything (removes volumes)
./scripts/docker-dev.sh clean
```

---

## Production Environment

### Build Production Images

```bash
./scripts/docker-prod.sh build
```

### Start Production Stack

```bash
# Ensure .env is configured for production
cp .env.example .env
# Edit .env with production values

# Start all services
./scripts/docker-prod.sh up
```

### Production Service URLs

- **Application**: http://localhost (via nginx)
- **Grafana**: http://localhost:3000
- **Prometheus**: http://localhost:9090
- **Jaeger UI**: http://localhost:16686

### Production Features

✅ **Multi-container app** - 2 replicas by default  
✅ **Nginx reverse proxy** - Load balancing & SSL termination  
✅ **Health checks** - Automatic container restart on failure  
✅ **Resource limits** - Prevents resource exhaustion  
✅ **Log rotation** - 10MB per file, 3 file maximum  
✅ **Automated backups** - Daily PostgreSQL backups  
✅ **Security hardening** - Non-root users, read-only volumes  

### Production Commands

```bash
# Check service health
./scripts/docker-prod.sh health

# View logs
./scripts/docker-prod.sh logs
./scripts/docker-prod.sh logs app

# Restart services
./scripts/docker-prod.sh restart
./scripts/docker-prod.sh restart app

# Scale application
./scripts/docker-prod.sh scale 4    # Scale to 4 replicas

# Backup database
./scripts/docker-prod.sh backup

# Restore database
./scripts/docker-prod.sh restore backups/pdfai_backup_20240101_120000.sql.gz

# Update application
./scripts/docker-prod.sh update     # Pull latest code, rebuild, restart

# Stop services
./scripts/docker-prod.sh down
```

---

## Docker Compose Files

### docker-compose.yml (Base)

Basic setup with all infrastructure services:
- PostgreSQL 15
- Redis 7
- Prometheus
- Grafana
- Jaeger

**Use for**: Quick infrastructure setup

```bash
docker-compose up -d
```

### docker-compose.dev.yml (Development)

Complete development environment:
- Application with hot reload
- PostgreSQL, Redis
- Optional observability (use `--profile observability`)

**Use for**: Local development

```bash
docker-compose -f docker-compose.dev.yml up -d
```

### docker-compose.prod.yml (Production)

Full production stack:
- Nginx reverse proxy
- Application (2 replicas)
- PostgreSQL, Redis with security
- Full observability stack
- Automated backups

**Use for**: Production deployment

```bash
docker-compose -f docker-compose.prod.yml up -d
```

---

## Environment Configuration

### Minimal Configuration (Development)

```bash
# .env
NODE_ENV=development
GOOGLE_API_KEY=your-google-api-key-here
GOOGLE_QUOTA_MANAGEMENT=true
```

### Production Configuration

```bash
# .env
NODE_ENV=production

# Database (REQUIRED)
DB_PASSWORD=super-secure-password-here
DATABASE_URL=postgresql://pdfai:super-secure-password@postgres:5432/pdfai

# Redis (OPTIONAL - adds password protection)
REDIS_PASSWORD=redis-secure-password

# LLM Providers (REQUIRED - at least one)
OPENAI_API_KEY=sk-your-openai-key-here
GOOGLE_API_KEY=your-google-api-key-here
GOOGLE_QUOTA_MANAGEMENT=true
GOOGLE_DAILY_QUOTA=1000000

# Security (REQUIRED)
JWT_SECRET=your-jwt-secret-min-32-chars
CORS_ORIGIN=https://yourdomain.com

# Grafana (OPTIONAL)
GRAFANA_PASSWORD=grafana-admin-password
GRAFANA_ROOT_URL=https://yourdomain.com/grafana

# File Upload
MAX_FILE_SIZE=104857600  # 100MB

# Observability
LOG_LEVEL=info
```

### Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | Yes | development | Environment mode |
| `PORT` | No | 3000 | Application port |
| `DATABASE_URL` | Yes | - | PostgreSQL connection string |
| `DB_PASSWORD` | Yes | - | PostgreSQL password |
| `REDIS_PASSWORD` | No | - | Redis password (adds auth) |
| `OPENAI_API_KEY` | One of | - | OpenAI API key |
| `GOOGLE_API_KEY` | One of | - | Google AI API key |
| `GOOGLE_QUOTA_MANAGEMENT` | No | true | Enable quota management |
| `GOOGLE_DAILY_QUOTA` | No | 1000000 | Daily token budget |
| `JWT_SECRET` | Yes (prod) | - | JWT signing secret |
| `CORS_ORIGIN` | No | * | Allowed CORS origins |
| `MAX_FILE_SIZE` | No | 52428800 | Max upload size (bytes) |
| `LOG_LEVEL` | No | info | Logging level |

---

## Service Management

### Check Service Status

```bash
# Development
docker-compose -f docker-compose.dev.yml ps

# Production
./scripts/docker-prod.sh status
```

### Restart Services

```bash
# Restart all services
docker-compose restart

# Restart specific service
docker-compose restart app
docker-compose restart postgres
```

### View Service Logs

```bash
# Follow all logs
docker-compose logs -f

# Follow specific service
docker-compose logs -f app

# Last 100 lines
docker-compose logs --tail=100 app

# Since timestamp
docker-compose logs --since="2024-01-01T00:00:00" app
```

### Execute Commands in Containers

```bash
# Open shell
docker-compose exec app sh

# Run command
docker-compose exec app npm run migrate:up

# Run as root
docker-compose exec --user root app sh
```

---

## Scaling & Load Balancing

### Scale Application Containers

```bash
# Production (via script)
./scripts/docker-prod.sh scale 4

# Manual
docker-compose -f docker-compose.prod.yml up -d --scale app=4
```

### Verify Scaling

```bash
docker-compose -f docker-compose.prod.yml ps app
```

### Load Balancing

In production, Nginx automatically load balances across app replicas:
- Round-robin distribution
- Health check based routing
- Automatic failover

---

## Backup & Restore

### Automated Backups

Production setup includes automated daily backups:
- Runs at midnight daily
- Keeps last 7 days of backups
- Stored in `./backups` directory
- Compressed with gzip

### Manual Backup

```bash
# Production
./scripts/docker-prod.sh backup

# Manual
docker-compose exec postgres pg_dump -U pdfai pdfai | gzip > backups/manual_$(date +%Y%m%d).sql.gz
```

### Restore from Backup

```bash
# Production (via script)
./scripts/docker-prod.sh restore backups/pdfai_backup_20240101.sql.gz

# Manual
gunzip -c backups/pdfai_backup_20240101.sql.gz | docker-compose exec -T postgres psql -U pdfai -d pdfai
```

### Backup Uploads & Data

```bash
# Backup uploads directory
tar -czf backups/uploads_$(date +%Y%m%d).tar.gz uploads/

# Backup data directory
tar -czf backups/data_$(date +%Y%m%d).tar.gz data/

# Full backup (database + files)
./scripts/docker-prod.sh backup && \
tar -czf backups/full_$(date +%Y%m%d).tar.gz uploads/ data/
```

---

## Monitoring & Logs

### Access Monitoring Dashboards

**Grafana** (http://localhost:3000):
- Username: admin
- Password: admin (dev) or from `GRAFANA_PASSWORD` (prod)
- Pre-configured dashboard for PDF Summary AI

**Prometheus** (http://localhost:9090):
- Query metrics directly
- Check targets status
- View alerts

**Jaeger** (http://localhost:16686):
- Distributed tracing
- Request flow visualization
- Performance analysis

### Key Metrics to Monitor

**Application**:
- Request rate (requests/second)
- Response time (p50, p95, p99)
- Error rate (%)
- Active connections

**LLM**:
- Token usage (per model)
- Quota status (%)
- Cost per request
- Provider failovers

**Database**:
- Connection pool usage
- Query latency
- Active transactions
- Database size

**Redis**:
- Memory usage
- Hit rate
- Commands per second

### View Container Logs

```bash
# Real-time logs
docker-compose logs -f app

# Last 100 lines
docker-compose logs --tail=100 app

# Filter by level
docker-compose logs app | grep ERROR

# Save to file
docker-compose logs app > app-logs.txt
```

### Log Aggregation (Production)

Production uses JSON logging with rotation:
- **Max size**: 10MB per file
- **Max files**: 3
- **Location**: Docker manages log files

Access logs via:
```bash
docker-compose logs --tail=1000 app > analysis.log
```

---

## Troubleshooting

### Common Issues

#### 1. Port Already in Use

**Error**: `bind: address already in use`

**Solution**:
```bash
# Check what's using the port
sudo lsof -i :3000

# Stop conflicting service or change port in .env
PORT=3002
```

#### 2. Database Connection Failed

**Error**: `connect ECONNREFUSED postgres:5432`

**Solution**:
```bash
# Check PostgreSQL status
docker-compose ps postgres

# Check PostgreSQL logs
docker-compose logs postgres

# Restart PostgreSQL
docker-compose restart postgres
```

#### 3. Out of Memory

**Error**: Container killed or crashes randomly

**Solution**:
```bash
# Check Docker resources
docker stats

# Increase Docker Desktop memory (Settings → Resources)
# Or reduce replicas
./scripts/docker-prod.sh scale 1
```

#### 4. Volume Permission Issues

**Error**: `EACCES: permission denied`

**Solution**:
```bash
# Fix permissions
sudo chown -R 1001:1001 uploads/ data/

# Or run as root (dev only)
docker-compose exec --user root app sh
```

#### 5. Build Fails for Native Modules

**Error**: `gyp ERR! build error`

**Solution**:
```bash
# Clear Docker cache
docker-compose build --no-cache app

# Or rebuild from scratch
docker system prune -a
docker-compose build
```

#### 6. Health Check Failing

**Error**: `unhealthy` status

**Solution**:
```bash
# Check health endpoint directly
docker-compose exec app wget -O- http://localhost:3000/api/health

# Check application logs
docker-compose logs --tail=50 app

# Restart if needed
docker-compose restart app
```

### Debug Mode

Enable verbose logging:

```bash
# .env
LOG_LEVEL=debug
DEBUG=true

# Restart services
docker-compose restart app
```

### Container Resource Usage

```bash
# Real-time stats
docker stats

# Specific container
docker stats pdfai-app

# Export to CSV
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}" > stats.csv
```

### Clean Everything

```bash
# Stop and remove containers, volumes, networks
docker-compose down -v

# Remove all Docker images
docker system prune -a

# Start fresh
docker-compose up -d --build
```

---

## Performance Optimization

### Production Tuning

**PostgreSQL**:
```bash
# Increase shared_buffers (25% of RAM)
# Add to docker-compose.prod.yml postgres command:
command:
  - postgres
  - -c shared_buffers=256MB
  - -c effective_cache_size=1GB
```

**Redis**:
```bash
# Increase max memory
# Add to docker-compose.prod.yml redis command:
command: redis-server --maxmemory 512mb --maxmemory-policy allkeys-lru
```

**Application**:
```bash
# Adjust worker processes
# Add to .env:
UV_THREADPOOL_SIZE=8
NODE_OPTIONS="--max-old-space-size=2048"
```

### Caching Strategy

Enable Redis caching in production:
```bash
# .env
ENABLE_CACHE=true
CACHE_TTL=3600  # 1 hour
```

---

## Security Best Practices

✅ **Use secrets** - Store sensitive data in Docker secrets or HashiCorp Vault  
✅ **Non-root users** - All containers run as non-root  
✅ **Read-only filesystems** - Where possible  
✅ **Network isolation** - Use Docker networks  
✅ **Resource limits** - Prevent DoS attacks  
✅ **Regular updates** - Keep images updated  
✅ **SSL/TLS** - Use HTTPS in production (configure Nginx)  
✅ **Strong passwords** - Generate with: `openssl rand -base64 32`  
✅ **Firewall rules** - Restrict access to internal services  

---

## Next Steps

1. ✅ Deploy development environment
2. ✅ Test with sample PDFs
3. ✅ Configure LLM providers
4. ✅ Set up monitoring dashboards
5. ✅ Configure automated backups
6. ✅ Deploy to production
7. ✅ Set up SSL certificates
8. ✅ Configure CI/CD pipeline

---

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)
- [Main README](../../README.md)
- [Multi-LLM Guide](../llm/MULTI-LLM-QUICKSTART.md)
- [Quota Management](../llm/QUOTA-MANAGEMENT.md)

---

**Repository**: https://github.com/abezr/pdf-summarize
