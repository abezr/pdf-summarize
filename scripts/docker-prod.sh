#!/bin/bash
# =============================================================================
# Docker Production Environment Management Script
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
    print_error ".env file not found!"
    print_info "Please create .env from .env.example and configure it for production"
    exit 1
fi

# Validate required environment variables
REQUIRED_VARS=("DB_PASSWORD" "JWT_SECRET")
MISSING_VARS=()

for VAR in "${REQUIRED_VARS[@]}"; do
    if ! grep -q "^${VAR}=" .env; then
        MISSING_VARS+=("$VAR")
    fi
done

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    print_error "Missing required environment variables in .env:"
    for VAR in "${MISSING_VARS[@]}"; do
        echo "  - $VAR"
    done
    exit 1
fi

# Parse command
COMMAND=${1:-up}

case $COMMAND in
    build)
        print_info "Building production images..."
        docker-compose -f docker-compose.prod.yml build
        print_info "Production images built!"
        ;;
    
    up)
        print_info "Starting production environment..."
        docker-compose -f docker-compose.prod.yml up -d
        print_info "Production environment started!"
        print_info "Application: http://localhost (via nginx)"
        print_info ""
        print_info "To view logs: $0 logs"
        ;;
    
    down)
        print_info "Stopping production environment..."
        docker-compose -f docker-compose.prod.yml down
        print_info "Production environment stopped!"
        ;;
    
    restart)
        SERVICE=${2:-}
        if [ -z "$SERVICE" ]; then
            print_info "Restarting all services..."
            docker-compose -f docker-compose.prod.yml restart
        else
            print_info "Restarting $SERVICE..."
            docker-compose -f docker-compose.prod.yml restart $SERVICE
        fi
        print_info "Restart complete!"
        ;;
    
    logs)
        SERVICE=${2:-}
        if [ -z "$SERVICE" ]; then
            print_info "Showing all logs..."
            docker-compose -f docker-compose.prod.yml logs -f
        else
            print_info "Showing logs for $SERVICE..."
            docker-compose -f docker-compose.prod.yml logs -f $SERVICE
        fi
        ;;
    
    status)
        print_info "Production environment status:"
        docker-compose -f docker-compose.prod.yml ps
        ;;
    
    scale)
        REPLICAS=${2:-2}
        print_info "Scaling app service to $REPLICAS replicas..."
        docker-compose -f docker-compose.prod.yml up -d --scale app=$REPLICAS
        print_info "App service scaled!"
        ;;
    
    backup)
        print_info "Triggering manual backup..."
        docker-compose -f docker-compose.prod.yml exec backup sh /backup.sh
        print_info "Backup completed! Check ./backups directory"
        ;;
    
    restore)
        BACKUP_FILE=${2:-}
        if [ -z "$BACKUP_FILE" ]; then
            print_error "Please specify backup file"
            print_info "Usage: $0 restore <backup-file>"
            print_info "Available backups:"
            ls -lh backups/*.sql.gz 2>/dev/null || echo "No backups found"
            exit 1
        fi
        
        print_warn "This will restore database from backup!"
        read -p "Are you sure? (yes/no): " CONFIRM
        if [ "$CONFIRM" = "yes" ]; then
            print_info "Restoring from $BACKUP_FILE..."
            gunzip -c "$BACKUP_FILE" | docker-compose -f docker-compose.prod.yml exec -T postgres psql -U pdfai -d pdfai
            print_info "Database restored!"
        else
            print_info "Cancelled"
        fi
        ;;
    
    health)
        print_info "Checking service health..."
        echo ""
        
        # Check app
        if curl -sf http://localhost/api/health > /dev/null 2>&1; then
            print_info "✓ Application: healthy"
        else
            print_error "✗ Application: unhealthy"
        fi
        
        # Check Prometheus
        if curl -sf http://localhost:9090/-/healthy > /dev/null 2>&1; then
            print_info "✓ Prometheus: healthy"
        else
            print_error "✗ Prometheus: unhealthy"
        fi
        
        # Check Grafana
        if curl -sf http://localhost:3000/api/health > /dev/null 2>&1; then
            print_info "✓ Grafana: healthy"
        else
            print_error "✗ Grafana: unhealthy"
        fi
        ;;
    
    update)
        print_info "Updating production environment..."
        git pull
        docker-compose -f docker-compose.prod.yml build
        docker-compose -f docker-compose.prod.yml up -d
        print_info "Production environment updated!"
        ;;
    
    clean-logs)
        print_info "Cleaning Docker logs..."
        docker-compose -f docker-compose.prod.yml exec app sh -c "truncate -s 0 /var/log/*"
        print_info "Logs cleaned!"
        ;;
    
    *)
        echo "Usage: $0 {build|up|down|restart|logs|status|scale|backup|restore|health|update|clean-logs}"
        echo ""
        echo "Commands:"
        echo "  build      - Build production images"
        echo "  up         - Start production environment"
        echo "  down       - Stop production environment"
        echo "  restart    - Restart services (optionally specify service)"
        echo "  logs       - Show logs (optionally specify service)"
        echo "  status     - Show status of all containers"
        echo "  scale N    - Scale app service to N replicas"
        echo "  backup     - Create manual database backup"
        echo "  restore F  - Restore database from backup file"
        echo "  health     - Check health of all services"
        echo "  update     - Pull latest code and rebuild"
        echo "  clean-logs - Clean container logs"
        exit 1
        ;;
esac
