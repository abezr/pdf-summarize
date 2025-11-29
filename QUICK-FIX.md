# Quick Fix - Docker Not Running

## The Problem

Docker Desktop is installed but not running. Error:
```
open //./pipe/docker_engine: The system cannot find the file specified
```

## Solution 1: Start Docker Desktop (2 minutes)

### Steps:
1. **Press Windows Key** → Type "Docker Desktop" → Open it
2. **Wait** for Docker to fully start (1-2 minutes)
3. **Look for whale icon** in system tray (bottom-right)
4. **Verify**:
   ```bash
   docker ps
   ```
   Should show a table (even if empty)

5. **Try again**:
   ```bash
   npm run docker:dev
   ```

### Troubleshooting Docker Desktop:

**If Docker Desktop shows errors:**
- Right-click whale icon → Restart
- Open Docker Desktop → Check for updates
- Settings → Reset → "Restart Docker Desktop"

**If Docker won't start at all:**
```powershell
# Run PowerShell as Administrator
Restart-Service com.docker.service
```

---

## Solution 2: Run Without Docker (5 minutes)

Skip Docker entirely and run directly:

### Requirements:
- PostgreSQL 15+ ([Download](https://www.postgresql.org/download/windows/))
- Node.js 20+ (already installed ✅)

### Quick Setup:

#### 1. Install PostgreSQL
Download and install: https://www.postgresql.org/download/windows/
- Default settings
- Remember your password!

#### 2. Create Database
```bash
# Open Command Prompt
psql -U postgres
```

In psql:
```sql
CREATE DATABASE pdf_summary_db;
\q
```

#### 3. Configure Project
```bash
cd /c/my/pdf-summarize

# Create .env if not exists
cp .env.example .env
```

Edit `.env`:
```env
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/pdf_summary_db
DB_HOST=localhost
DB_PORT=5432
DB_NAME=pdf_summary_db
DB_USER=postgres
DB_PASSWORD=YOUR_PASSWORD

# LLM (get free key: https://makersuite.google.com/app/apikey)
GOOGLE_API_KEY=your-google-key-here
GOOGLE_QUOTA_MANAGEMENT=true

# Storage
UPLOAD_DIR=./data/uploads
MAX_FILE_SIZE=52428800

# OCR
OCR_ENABLED=true
OCR_PROVIDER=tesseract
```

#### 4. Install & Run
```bash
# Install dependencies (if not done)
npm install

# Run migrations
npm run migrate:up

# Start server
npm run dev
```

#### 5. Access
**API**: http://localhost:3000/api/health

---

## Which Should You Choose?

### Use Docker If:
- ✅ You need full observability stack (Grafana, Prometheus)
- ✅ You want production-like environment
- ✅ Docker Desktop starts fine

### Skip Docker If:
- ✅ Docker won't start or has issues
- ✅ You want faster development cycle
- ✅ You're actively coding (hot reload is faster)

---

## Quick Decision Tree

```
Can you run "docker ps" successfully?
├─ YES → Use Docker
│   └─ Run: npm run docker:dev
│
└─ NO → Docker not running
    ├─ Want to fix Docker?
    │   └─ Start Docker Desktop → wait → retry
    │
    └─ Skip Docker for now?
        └─ Install PostgreSQL → npm run dev
```

---

## Verification Commands

### Check Docker:
```bash
docker --version          # Should show version
docker ps                 # Should show table
docker info              # Should show detailed info
```

### Check PostgreSQL (no Docker):
```bash
psql --version           # Should show version
psql -U postgres         # Should connect
```

### Check Node.js:
```bash
node --version           # Should be 20+
npm --version            # Should be 9+
```

---

## Next Steps

**If Docker works:**
```bash
npm run docker:dev
# Access: http://localhost:3001
```

**If using local PostgreSQL:**
```bash
npm run dev
# Access: http://localhost:3000
```

---

## Need More Help?

- **[Docker Issues](docs/guides/WINDOWS-SETUP.md#issue-2-docker-desktop-not-running)** - Detailed troubleshooting
- **[No-Docker Setup](docs/guides/QUICK-START-NO-DOCKER.md)** - Complete guide
- **[Windows Setup](docs/guides/WINDOWS-SETUP.md)** - Full Windows guide

---

**Repository**: https://github.com/abezr/pdf-summarize
