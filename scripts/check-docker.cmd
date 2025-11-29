@echo off
REM Check Docker Desktop status on Windows

echo =====================================
echo Docker Desktop Status Check
echo =====================================
echo.

echo [1/4] Checking Docker version...
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker not found or not in PATH
    echo.
    echo Please install Docker Desktop:
    echo https://www.docker.com/products/docker-desktop/
    echo.
    pause
    exit /b 1
) else (
    docker --version
    echo ✅ Docker installed
)
echo.

echo [2/4] Checking if Docker daemon is running...
docker ps >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker daemon not running
    echo.
    echo Please start Docker Desktop:
    echo 1. Press Windows Key
    echo 2. Type "Docker Desktop"
    echo 3. Open the application
    echo 4. Wait for it to start (whale icon in system tray)
    echo.
    pause
    exit /b 1
) else (
    echo ✅ Docker daemon is running
)
echo.

echo [3/4] Checking Docker Compose...
docker-compose --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker Compose not found
    echo.
    echo Docker Compose should be included with Docker Desktop.
    echo Please reinstall Docker Desktop.
    echo.
    pause
    exit /b 1
) else (
    docker-compose --version
    echo ✅ Docker Compose available
)
echo.

echo [4/4] Checking running containers...
docker ps
echo.

echo =====================================
echo ✅ All checks passed!
echo =====================================
echo.
echo You can now run:
echo   npm run docker:dev
echo.
pause
