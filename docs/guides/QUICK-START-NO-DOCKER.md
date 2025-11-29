# Quick Start Without Docker

Run PDF Summary AI locally without Docker for faster development.

## Prerequisites

- Node.js 20+ ([Download](https://nodejs.org/))
- PostgreSQL 15+ ([Download](https://www.postgresql.org/download/windows/))
- Git ([Download](https://git-scm.com/download/win))

## Setup (10 minutes)

### 1. Install PostgreSQL

**Windows**:
1. Download PostgreSQL: https://www.postgresql.org/download/windows/
2. Run installer
3. During installation:
   - Password: Choose a password (e.g., `postgres`)
   - Port: Keep default `5432`
   - Locale: Default
4. Complete installation

**Verify**:
```cmd
psql --version
```

### 2. Create Database

```cmd
:: Open PostgreSQL command line
psql -U postgres

:: In psql, create database:
CREATE DATABASE pdf_summary_db;
\q
```

### 3. Setup Project

```cmd
:: Clone repository (if not done)
git clone https://github.com/abezr/pdf-summarize.git
cd pdf-summarize

:: Install dependencies
npm install

:: Create environment file
copy .env.example .env
```

### 4. Configure Environment

Edit `.env` with Notepad:
```cmd
notepad .env
```

**Minimal configuration**:
```env
# Server
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/pdf_summary_db
DB_HOST=localhost
DB_PORT=5432
DB_NAME=pdf_summary_db
DB_USER=postgres
DB_PASSWORD=postgres

# LLM Provider (choose ONE)
GOOGLE_API_KEY=your-google-key-here
# OR
# OPENAI_API_KEY=sk-your-openai-key-here

# Quota Management (if using Google)
GOOGLE_QUOTA_MANAGEMENT=true
GOOGLE_DAILY_QUOTA=1000000

# File Storage
UPLOAD_DIR=./data/uploads
MAX_FILE_SIZE=52428800

# OCR
OCR_ENABLED=true
OCR_PROVIDER=tesseract

# Observability (optional)
METRICS_ENABLED=true
LOG_LEVEL=info
```

**Important**: Replace `your-google-key-here` with your actual API key!

**Get API Keys**:
- Google AI (FREE): https://makersuite.google.com/app/apikey
- OpenAI (Paid): https://platform.openai.com/api-keys

### 5. Run Migrations

```cmd
npm run migrate:up
```

### 6. Start Development Server

```cmd
npm run dev
```

**Output**:
```
🚀 Server running on port 3000
📊 Prometheus metrics: http://localhost:3000/metrics
💾 Database: Connected
🔥 Hot reload enabled
```

### 7. Access Application

Open browser:
- **API**: http://localhost:3000/api/health
- **Upload**: http://localhost:3000/api/documents/upload

## Quick Test

```cmd
:: Test health endpoint
curl http://localhost:3000/api/health

:: Expected response:
:: {
::   "status": "ok",
::   "providers": {
::     "google": true
::   }
:: }
```

## Optional: Install Redis (For Caching)

### Windows - Using Memurai (Redis for Windows)

1. **Download Memurai**: https://www.memurai.com/get-memurai
2. Install and start service
3. Add to `.env`:
   ```env
   REDIS_HOST=localhost
   REDIS_PORT=6379
   ```

### Or: Run Redis in Docker Only

```cmd
docker run -d -p 6379:6379 --name redis redis:7-alpine
```

Then add to `.env`:
```env
REDIS_HOST=localhost
REDIS_PORT=6379
```

## Troubleshooting

### Database Connection Failed

**Check PostgreSQL is running**:
```cmd
:: Windows
services.msc
:: Look for "postgresql-x64-15"

:: Or check if port is listening
netstat -ano | findstr :5432
```

**Test connection**:
```cmd
psql -U postgres -d pdf_summary_db
```

### Port Already in Use

```cmd
:: Find what's using port 3000
netstat -ano | findstr :3000

:: Kill the process (replace <PID>)
taskkill /PID <PID> /F

:: Or change port in .env
```

### Migration Errors

```cmd
:: Reset database
psql -U postgres -c "DROP DATABASE pdf_summary_db;"
psql -U postgres -c "CREATE DATABASE pdf_summary_db;"

:: Run migrations again
npm run migrate:up
```

### Missing Dependencies

```cmd
:: Clear and reinstall
rmdir /s /q node_modules
del package-lock.json
npm install
```

## Development Workflow

### Daily Development

```cmd
:: 1. Start PostgreSQL (auto-starts as Windows service)

:: 2. Start dev server
npm run dev

:: 3. Make changes - hot reload automatic

:: 4. Stop server: Ctrl+C
```

### Running Tests

```cmd
npm test
npm run test:watch
```

### Linting & Formatting

```cmd
npm run lint
npm run format
```

### Database Management

```cmd
:: Create new migration
npm run migrate create migration-name

:: Run migrations
npm run migrate:up

:: Rollback migration
npm run migrate:down
```

## Project Structure

```
pdf-summarize/
├── src/
│   ├── api/              # REST API
│   ├── services/         # Business logic
│   │   ├── llm/         # LLM providers
│   │   └── ...
│   ├── database/         # Migrations
│   └── server.ts         # Entry point
├── data/                 # Local file storage
│   └── uploads/         # PDF uploads
├── .env                  # Your configuration
└── package.json
```

## Advantages of No-Docker Setup

✅ **Faster startup** - No container overhead  
✅ **Hot reload** - Instant code changes  
✅ **Better debugging** - Direct Node.js debugging  
✅ **Lower resource usage** - No Docker Desktop needed  
✅ **Easier troubleshooting** - Direct logs and errors  

## When to Use Docker

- **Production deployment**
- **Team consistency** (everyone same environment)
- **Full stack testing** (with Prometheus, Grafana, etc.)
- **CI/CD pipelines**

## Next Steps

1. ✅ Got it running? Try uploading a PDF!
2. 📖 Read [Quick Reference](./QUICK-REFERENCE.md)
3. 🤖 Configure LLM? See [LLM Guide](../llm/README.md)
4. 🐳 Want Docker later? See [Docker Guide](./DOCKER-GUIDE.md)

## Summary

**Full Stack (Development)**:
```cmd
npm run dev
```

**Production Build**:
```cmd
npm run build
npm start
```

**With Docker (Later)**:
```cmd
npm run docker:dev
```

All approaches work great! Choose what fits your workflow.

---

**Repository**: https://github.com/abezr/pdf-summarize  
**Need Help?** Check [Windows Setup](./WINDOWS-SETUP.md)
