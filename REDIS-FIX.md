# Redis Connection Error - Quick Fix

## Error
```
Error: connect ECONNREFUSED 127.0.0.1:6379
```

This means Redis is not running. You have 3 options:

---

## Option 1: Comment Out Redis (Fastest - 30 seconds) ⭐

Edit your `.env` file:

```bash
# Open .env
notepad .env
```

**Comment out or remove the Redis line**:
```env
# REDIS_URL=redis://localhost:6379
```

Or just delete the line entirely.

**Restart the app**:
```bash
# Press Ctrl+C to stop the current server
# Then start again:
npm run dev
```

The app will work without Redis (it's only used for caching).

---

## Option 2: Run Redis in Docker (2 minutes)

If you want Redis for caching:

```bash
# Run just Redis container
docker run -d --name redis -p 6379:6379 redis:7-alpine

# Verify it's running
docker ps
```

**Then restart your app**:
```bash
npm run dev
```

---

## Option 3: Install Redis on Windows (10 minutes)

### Using Memurai (Redis for Windows)

1. **Download Memurai**: https://www.memurai.com/get-memurai
2. **Install** and start the service
3. **Verify**:
   ```bash
   # Should connect
   redis-cli ping
   ```

4. **Restart app**:
   ```bash
   npm run dev
   ```

---

## Recommended Approach

**For development**: Use **Option 1** (comment out Redis)
- Fastest
- No dependencies
- App works fine without it
- You can add Redis later if needed

**For testing caching**: Use **Option 2** (Docker Redis)
- Quick to set up
- Easy to start/stop
- No Windows installation needed

---

## Verify Your Fix

After applying one of the options:

```bash
# Start the app
npm run dev
```

**Expected output**:
```
🚀 Server running on port 3000
📊 Prometheus metrics: http://localhost:3000/metrics
💾 Database: Connected
✅ Health check: http://localhost:3000/api/health
```

**Test health**:
```bash
curl http://localhost:3000/api/health
```

Should return:
```json
{
  "status": "ok",
  "database": "connected",
  "providers": {
    "google": true
  }
}
```

---

## What is Redis Used For?

In this project, Redis is **optional** and used for:
- ✅ Graph caching (performance optimization)
- ✅ Embedding caching (cost savings)
- ✅ Session storage (future feature)

**The app works perfectly fine without Redis!** It just means:
- No caching (slightly slower repeated operations)
- Direct database access (still fast)
- All core features work normally

---

## Summary

**Problem**: Redis not running on port 6379  
**Fastest Fix**: Comment out `REDIS_URL` in `.env`  
**Alternative**: Run Redis in Docker  

Choose Option 1 for now, add Redis later if you need caching.

---

**Repository**: https://github.com/abezr/pdf-summarize
