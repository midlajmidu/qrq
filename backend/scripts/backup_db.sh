#!/usr/bin/env bash
# =============================================================================
# scripts/backup_db.sh
# Automated PostgreSQL backup script.
#
# Features:
#   - Daily full pg_dump (compressed + timestamped)
#   - Retention policy (keeps last 7 days)
#   - Optional upload to S3/cloud storage
#   - Restore verification hint
#
# Usage:
#   chmod +x scripts/backup_db.sh
#   ./scripts/backup_db.sh
#
# Cron (daily at 2AM):
#   0 2 * * * /path/to/scripts/backup_db.sh >> /var/log/queue_backup.log 2>&1
# =============================================================================
set -euo pipefail

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# ── Configuration ─────────────────────────────────────────────────
CONTAINER_NAME="queue_postgres"
DB_USER="${POSTGRES_USER:-appuser}"
DB_NAME="${POSTGRES_DB:-queuedb}"
BACKUP_DIR="/backups"
RETENTION_DAYS=7
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.sql.gz"

# ── Create backup directory ───────────────────────────────────────
mkdir -p "$BACKUP_DIR"

echo -e "${YELLOW}━━━ Database Backup ━━━${NC}"
echo "  Database:  $DB_NAME"
echo "  Container: $CONTAINER_NAME"
echo "  Timestamp: $TIMESTAMP"
echo "  Output:    $BACKUP_FILE"

# ── Execute backup ────────────────────────────────────────────────
echo -e "\n${YELLOW}Creating backup...${NC}"
if docker exec "$CONTAINER_NAME" pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_FILE"; then
    SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo -e "${GREEN}✅ Backup created: $BACKUP_FILE ($SIZE)${NC}"
else
    echo -e "${RED}❌ Backup failed!${NC}"
    exit 1
fi

# ── Verify backup ─────────────────────────────────────────────────
echo -e "\n${YELLOW}Verifying backup integrity...${NC}"
if gunzip -t "$BACKUP_FILE" 2>/dev/null; then
    echo -e "${GREEN}✅ Backup file integrity verified${NC}"
else
    echo -e "${RED}❌ Backup file is corrupted!${NC}"
    exit 1
fi

# ── Retention cleanup ─────────────────────────────────────────────
echo -e "\n${YELLOW}Cleaning backups older than ${RETENTION_DAYS} days...${NC}"
DELETED=$(find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz" -mtime +$RETENTION_DAYS -delete -print | wc -l)
echo "  Deleted: $DELETED old backup(s)"

# ── List current backups ──────────────────────────────────────────
echo -e "\n${YELLOW}Current backups:${NC}"
ls -lh "$BACKUP_DIR"/${DB_NAME}_*.sql.gz 2>/dev/null || echo "  (none)"

# ── (Optional) Upload to S3 ──────────────────────────────────────
# Uncomment and configure for cloud backup:
# S3_BUCKET="s3://your-bucket/backups/"
# aws s3 cp "$BACKUP_FILE" "$S3_BUCKET"
# echo -e "${GREEN}✅ Uploaded to $S3_BUCKET${NC}"

echo -e "\n${GREEN}━━━ Backup complete ━━━${NC}"
echo ""
echo "  To restore:"
echo "    gunzip -c $BACKUP_FILE | docker exec -i $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME"
echo ""
echo "  Recovery time estimate: ~30 seconds for <10GB database"
