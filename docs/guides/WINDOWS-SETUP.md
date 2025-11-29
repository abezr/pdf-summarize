# Windows Setup Guide

Complete guide for running PDF Summary AI on Windows.

## Prerequisites

### Required Software

1. **Node.js 20+**
   - Download: https://nodejs.org/
   - Verify: `node --version`

2. **Docker Desktop for Windows**
   - Download: https://www.docker.com/products/docker-desktop/
   - Install and start Docker Desktop
   - Verify: `docker --version`

3. **Git for Windows**
   - Download: https://git-scm.com/download/win
   - Or use GitHub Desktop: https://desktop.github.com/

4. **PostgreSQL** (if not using Docker)
   - Download: https://www.postgresql.org/download/windows/
   - Or use Docker (recommended)

## Quick Start (Windows)

### Option 1: Direct Node.js (Fastest for Development)

```cmd
:: 1. Clone repository
git clone https://github.com/abezr/pdf-summarize.git
cd pdf-summarize

:: 2. Install dependencies
npm install

:: 3. Configure environment
copy .env.example .env
:: Edit .env with Notepad and add your API key:
:: GOOGLE_API_KEY=your-key-here

:: 4. Start PostgreSQL (if not using Docker)
:: Option A: Use local PostgreSQL installation
:: Option B: Use Docker (see below)

:: 5. Run development server
npm run dev
```

**Access**: http://localhost:3000

### Option 2: Docker (Production-like)

```cmd
:: 1. Clone and setup
git clone https://github.com/abezr/pdf-summarize.git
cd pdf-summarize
copy .env.example .env

:: 2. Edit .env file (use Notepad)
notepad .env
:: Add: GOOGLE_API_KEY=your-key-here

:: 3. Start with Docker Compose
npm run docker:dev

:: Or with build:
npm run docker:dev:build
```

**Access**: http://localhost:3001

## Windows-Compatible NPM Scripts

All scripts work on Windows Command Prompt and PowerShell:

```cmd
:: Development
npm run dev                  :: Start dev server
npm run build               :: Build for production
npm run start               :: Start production server

:: Docker - Development
npm run docker:dev          :: Start dev environment
npm run docker:dev:build    :: Build and start
npm run docker:dev:down     :: Stop dev environment

:: Docker - Production
npm run docker:prod:build   :: Build production images
npm run docker:prod:up      :: Start production
npm run docker:prod:down    :: Stop production

:: Testing
npm test                    :: Run tests
npm run lint                :: Lint code

:: Database
npm run migrate:up          :: Run migrations
npm run migrate:down        :: Rollback migrations
```

## Common Windows Issues

### Issue 1: "Command not found" or script errors

**Cause**: Shell scripts (`.sh`) don't work on Windows

**Solution**: Use the updated npm scripts (already fixed):
```cmd
:: Don't use:
./scripts/docker-dev.sh up

:: Use instead:
npm run docker:dev
```

### Issue 2: Docker Desktop not running or installed

**Quick Check**: Run diagnostic script:
```cmd
scripts\check-docker.cmd
```

This will tell you exactly what's wrong.

**Cause**: Docker Desktop not installed, not running, or WSL 2 not enabled

**Solutions**:

1. **Enable WSL 2**:
   ```powershell
   # Run in PowerShell as Administrator
   wsl --install
   wsl --set-default-version 2
   ```

2. **Enable Hyper-V** (Windows Pro/Enterprise):
   - Control Panel → Programs → Turn Windows features on/off
   - Check "Hyper-V"
   - Restart

3. **Check Docker Desktop Settings**:
   - Open Docker Desktop
   - Settings → General
   - Ensure "Use WSL 2 based engine" is checked

### Issue 3: Port already in use

**Cause**: Another application using port 3000

**Solution**:
```cmd
:: Find what's using the port
netstat -ano | findstr :3000

:: Kill the process (replace PID)
taskkill /PID <PID> /F

:: Or change port in .env
echo PORT=3001 >> .env
```

### Issue 4: PostgreSQL connection failed

**Cause**: PostgreSQL not running or wrong connection string

**Solutions**:

**Option A: Use Docker for PostgreSQL**:
```cmd
docker-compose up -d postgres
```

**Option B: Install PostgreSQL locally**:
1. Download from https://www.postgresql.org/download/windows/
2. Install with default settings
3. Update `.env`:
   ```
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=pdf_summary_db
   DB_USER=postgres
   DB_PASSWORD=your-password
   ```

**Option C: Use Docker full stack**:
```cmd
npm run docker:dev
```

### Issue 5: Line ending issues (LF vs CRLF)

**Cause**: Git converting line endings

**Solution**:
```cmd
:: Configure Git (one-time setup)
git config --global core.autocrlf false

:: If you already cloned, reclone:
cd ..
rmdir /s /q pdf-summarize
git clone https://github.com/abezr/pdf-summarize.git
```

### Issue 6: Permission denied on node_modules

**Cause**: Antivirus or file permissions

**Solutions**:
1. Run cmd/PowerShell as Administrator
2. Exclude project folder from antivirus
3. Check file permissions:
   ```cmd
   icacls node_modules /grant Users:F /T
   ```

## PowerShell vs Command Prompt

Both work, but here are differences:

### Command Prompt (cmd.exe)
```cmd
cd C:\projects\pdf-summarize
copy .env.example .env
npm run dev
```

### PowerShell
```powershell
cd C:\projects\pdf-summarize
Copy-Item .env.example .env
npm run dev
```

**Recommendation**: Use Command Prompt for simplicity.

## Development Workflow (Windows)

### 1. Daily Development (No Docker)

```cmd
:: Start PostgreSQL (if using local install)
:: Or: docker-compose up -d postgres redis

:: Start dev server
npm run dev

:: In another terminal - watch logs
```

### 2. Full Stack Development (With Docker)

```cmd
:: Start everything
npm run docker:dev

:: View logs
docker-compose -f docker-compose.dev.yml logs -f app

:: Stop everything
npm run docker:dev:down
```

### 3. Testing Production Build

```cmd
:: Build production images
npm run docker:prod:build

:: Start production
npm run docker:prod:up

:: Test at http://localhost

:: Stop
npm run docker:prod:down
```

## IDE Setup (Windows)

### Visual Studio Code

1. **Install Extensions**:
   - ESLint
   - Prettier
   - Docker
   - PostgreSQL

2. **Configure Settings** (`.vscode/settings.json`):
   ```json
   {
     "editor.formatOnSave": true,
     "editor.defaultFormatter": "esbenp.prettier-vscode",
     "files.eol": "\n"
   }
   ```

3. **Integrated Terminal**:
   - File → Preferences → Settings
   - Terminal › Integrated › Default Profile: Windows → Command Prompt

### WebStorm / IntelliJ IDEA

1. Settings → Languages & Frameworks → Node.js
2. Set Node interpreter
3. Enable ESLint and Prettier
4. Set line separator to LF

## Environment Variables (Windows)

### Method 1: .env file (Recommended)

```cmd
copy .env.example .env
notepad .env
```

### Method 2: System Environment Variables

```cmd
:: Set for current session
set GOOGLE_API_KEY=your-key-here
set PORT=3000

:: Set permanently (PowerShell as Admin)
[Environment]::SetEnvironmentVariable("GOOGLE_API_KEY", "your-key-here", "User")
```

## Troubleshooting Commands

```cmd
:: Check Node/npm versions
node --version
npm --version

:: Check Docker
docker --version
docker ps

:: Check ports in use
netstat -ano | findstr :3000

:: Check PostgreSQL connection
psql -U postgres -d pdf_summary_db

:: Clear npm cache
npm cache clean --force
rmdir /s /q node_modules
npm install

:: Docker cleanup
docker system prune -a
docker volume prune
```

## Performance Tips (Windows)

1. **Use Docker Desktop with WSL 2** - Much faster than Hyper-V
2. **Exclude from Antivirus**:
   - Add `node_modules\` to exclusions
   - Add Docker volumes to exclusions
3. **Use SSD** - Place project on SSD, not HDD
4. **Increase Docker Resources**:
   - Docker Desktop → Settings → Resources
   - Increase CPU and Memory allocation

## Accessing Services

After starting with `npm run docker:dev`:

| Service | URL | Description |
|---------|-----|-------------|
| **API** | http://localhost:3001/api | Backend API |
| **Health** | http://localhost:3001/api/health | Health check |
| **Grafana** | http://localhost:3000 | Metrics (admin/admin) |
| **Prometheus** | http://localhost:9090 | Metrics collection |
| **Jaeger** | http://localhost:16686 | Tracing |

## Next Steps

1. ✅ Got it running? Check [Quick Reference](./QUICK-REFERENCE.md)
2. 🤖 Configure LLM? See [LLM Guide](../llm/README.md)
3. 🐳 Production deployment? See [Docker Guide](./DOCKER-GUIDE.md)
4. 🐛 Issues? Check [Troubleshooting](#common-windows-issues)

## Additional Resources

- **Node.js on Windows**: https://nodejs.org/en/download/
- **Docker Desktop**: https://docs.docker.com/desktop/windows/
- **WSL 2**: https://docs.microsoft.com/en-us/windows/wsl/install
- **PostgreSQL**: https://www.postgresql.org/download/windows/

## Summary

**Recommended Setup for Windows**:
1. Install Docker Desktop with WSL 2
2. Clone repository
3. Copy `.env.example` to `.env`
4. Add `GOOGLE_API_KEY` to `.env`
5. Run `npm run docker:dev`
6. Access http://localhost:3001

**Fastest Development**:
1. Install Node.js 20+
2. Install PostgreSQL locally
3. Run `npm install`
4. Run `npm run dev`

Both work great on Windows! 🚀

---

**Repository**: https://github.com/abezr/pdf-summarize  
**Need Help?** Open an issue on GitHub
