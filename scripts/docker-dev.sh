#!/bin/bash
# =============================================================================
# Docker Development Environment Management Script
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if .env exists
if [ ! -f ".env" ]; then
    print_warn ".env file not found. Creating from .env.example..."
    cp .env.example .env
    print_info "Please edit .env and add your API keys"
    exit 1
fi

# Parse command
COMMAND=${1:-up}

case $COMMAND in
    up)
        print_info "Starting development environment..."
        docker-compose -f docker-compose.dev.yml up -d
        print_info "Development environment started!"
        print_info "Application: http://localhost:3001"
        print_info "PostgreSQL: localhost:5432"
        print_info "Redis: localhost:6379"
        print_info ""
        print_info "To view logs: $0 logs"
        ;;
    
    up-full)
        print_info "Starting development environment with observability..."
        docker-compose -f docker-compose.dev.yml --profile observability up -d
        print_info "Full development environment started!"
        print_info "Application: http://localhost:3001"
        print_info "Grafana: http://localhost:3000 (admin/admin)"
        print_info "Prometheus: http://localhost:9090"
        ;;
    
    down)
        print_info "Stopping development environment..."
        docker-compose -f docker-compose.dev.yml down
        print_info "Development environment stopped!"
        ;;
    
    restart)
        print_info "Restarting development environment..."
        docker-compose -f docker-compose.dev.yml restart
        print_info "Development environment restarted!"
        ;;
    
    logs)
        SERVICE=${2:-app}
        print_info "Showing logs for $SERVICE..."
        docker-compose -f docker-compose.dev.yml logs -f $SERVICE
        ;;
    
    shell)
        SERVICE=${2:-app}
        print_info "Opening shell in $SERVICE..."
        docker-compose -f docker-compose.dev.yml exec $SERVICE sh
        ;;
    
    db)
        print_info "Opening PostgreSQL shell..."
        docker-compose -f docker-compose.dev.yml exec postgres psql -U pdfai -d pdfai
        ;;
    
    redis-cli)
        print_info "Opening Redis CLI..."
        docker-compose -f docker-compose.dev.yml exec redis redis-cli
        ;;
    
    clean)
        print_warn "This will remove all containers, volumes, and data!"
        read -p "Are you sure? (yes/no): " CONFIRM
        if [ "$CONFIRM" = "yes" ]; then
            print_info "Cleaning development environment..."
            docker-compose -f docker-compose.dev.yml down -v
            rm -rf uploads/* data/*
            print_info "Development environment cleaned!"
        else
            print_info "Cancelled"
        fi
        ;;
    
    rebuild)
        print_info "Rebuilding application image..."
        docker-compose -f docker-compose.dev.yml build --no-cache app
        print_info "Application image rebuilt!"
        ;;
    
    status)
        print_info "Docker containers status:"
        docker-compose -f docker-compose.dev.yml ps
        ;;
    
    *)
        echo "Usage: $0 {up|up-full|down|restart|logs|shell|db|redis-cli|clean|rebuild|status}"
        echo ""
        echo "Commands:"
        echo "  up        - Start development environment (app, postgres, redis)"
        echo "  up-full   - Start with observability (includes prometheus, grafana)"
        echo "  down      - Stop development environment"
        echo "  restart   - Restart all services"
        echo "  logs      - Show logs (optionally specify service)"
        echo "  shell     - Open shell in container (optionally specify service)"
        echo "  db        - Open PostgreSQL shell"
        echo "  redis-cli - Open Redis CLI"
        echo "  clean     - Remove all containers, volumes, and data"
        echo "  rebuild   - Rebuild application image from scratch"
        echo "  status    - Show status of all containers"
        exit 1
        ;;
esac
