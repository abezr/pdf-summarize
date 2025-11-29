#!/bin/sh
# =============================================================================
# PostgreSQL Backup Script
# Automated daily backup with rotation
# =============================================================================

set -e

BACKUP_DIR="/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/pdfai_backup_$TIMESTAMP.sql.gz"
KEEP_DAYS=7

echo "Starting backup at $(date)"

# Create backup
pg_dump --clean --if-exists | gzip > "$BACKUP_FILE"

echo "Backup completed: $BACKUP_FILE"

# Remove old backups
find "$BACKUP_DIR" -name "pdfai_backup_*.sql.gz" -mtime +$KEEP_DAYS -delete

echo "Old backups cleaned up"
echo "Backup process finished at $(date)"
