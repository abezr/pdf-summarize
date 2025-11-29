# 🚀 Quick Start - Docker is Ready!

Docker is set up! Here's how to start:

## Start Development Environment

```cmd
npm run docker:dev
```

This will:
- Start PostgreSQL database
- Start Redis cache
- Start the API server with hot-reload
- Start Prometheus (metrics)
- Start Grafana (dashboards)
- Start Jaeger (tracing)

## Access Points

After running `npm run docker:dev`, access:

| Service | URL | Credentials |
|---------|-----|-------------|
| **API** | http://localhost:3001/api | - |
| **Health Check** | http://localhost:3001/api/health | - |
| **Grafana** | http://localhost:3000 | admin / admin |
| **Prometheus** | http://localhost:9090 | - |
| **Jaeger** | http://localhost:16686 | - |

## First Time Setup

1. **Make sure .env exists**:
   ```cmd
   copy .env.example .env
   ```

2. **Add your API key** (edit .env):
   ```env
   GOOGLE_API_KEY=your-key-here
   GOOGLE_QUOTA_MANAGEMENT=true
   ```

3. **Start everything**:
   ```cmd
   npm run docker:dev
   ```

## Verify It's Working

**Test health endpoint**:
```cmd
curl http://localhost:3001/api/health
```

**Expected response**:
```json
{
  "status": "ok",
  "database": "connected",
  "redis": "connected",
  "providers": {
    "google": true
  }
}
```

## Common Commands

```cmd
# Start development
npm run docker:dev

# Start with rebuild (if you changed Dockerfile)
npm run docker:dev:build

# Stop everything
npm run docker:dev:down

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# View logs for specific service
docker-compose -f docker-compose.dev.yml logs -f app
```

## Troubleshooting

### Port already in use
```cmd
# Stop all containers
npm run docker:dev:down

# Try again
npm run docker:dev
```

### Container won't start
```cmd
# Check logs
docker-compose -f docker-compose.dev.yml logs

# Rebuild
npm run docker:dev:build
```

### Need to reset everything
```cmd
# Stop and remove everything
docker-compose -f docker-compose.dev.yml down -v

# Start fresh
npm run docker:dev:build
```

## Next Steps

1. ✅ Start with `npm run docker:dev`
2. 📖 Read [Quick Reference](docs/guides/QUICK-REFERENCE.md)
3. 🤖 Configure LLM: [LLM Guide](docs/llm/README.md)
4. 🧪 Test API: Upload a PDF via http://localhost:3001/api/documents/upload

---

**Need help?** Check the [Windows Setup Guide](docs/guides/WINDOWS-SETUP.md)
