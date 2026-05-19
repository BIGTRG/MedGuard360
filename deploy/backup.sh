#!/usr/bin/env bash
# MedGuard360 — server-side backup script.
#
# Backs up Postgres (full dump) and copies MinIO data. Stored in
# /opt/medguard360/backups/ with date stamps. Keeps the last 14 days
# of full backups; older ones are rotated.
#
# Run manually:        ./deploy/backup.sh
# Run from update.sh:  (automatic)
# Run nightly via cron:
#   crontab -e
#   0 2 * * * cd /opt/medguard360 && ./deploy/backup.sh --quiet >> /var/log/medguard-backup.log 2>&1

set -euo pipefail
cd "$(dirname "$0")/.."

COMPOSE="${COMPOSE:-docker-compose.onprem.yml}"
BACKUP_DIR="${BACKUP_DIR:-/opt/medguard360/backups}"
KEEP_DAYS="${KEEP_DAYS:-14}"
TODAY=$(date +%Y-%m-%d_%H%M%S)
QUIET=0

[[ "${1:-}" == "--quiet" ]] && QUIET=1

log() { (( QUIET )) || echo "$@"; }

mkdir -p "$BACKUP_DIR"

# ============================================================
# Postgres
# ============================================================
log "→ Backing up Postgres..."
docker compose -f "$COMPOSE" exec -T postgres \
  pg_dump -U "${PG_USER:-medguard}" -d "${PG_DATABASE:-medguard360}" \
    --no-owner --clean --if-exists \
  | gzip > "$BACKUP_DIR/postgres-$TODAY.sql.gz"

PG_SIZE=$(du -h "$BACKUP_DIR/postgres-$TODAY.sql.gz" | cut -f1)
log "  ✓ postgres-$TODAY.sql.gz ($PG_SIZE)"

# ============================================================
# MinIO (PHI documents, audio, video, EDI payloads)
# ============================================================
if [[ -d ./data/minio ]]; then
  log "→ Backing up MinIO data..."
  tar --create --gzip \
    --file "$BACKUP_DIR/minio-$TODAY.tar.gz" \
    -C ./data minio 2>/dev/null
  MINIO_SIZE=$(du -h "$BACKUP_DIR/minio-$TODAY.tar.gz" | cut -f1)
  log "  ✓ minio-$TODAY.tar.gz ($MINIO_SIZE)"
fi

# ============================================================
# Rotation — keep only KEEP_DAYS most recent of each kind
# ============================================================
log "→ Rotating backups older than $KEEP_DAYS days..."
find "$BACKUP_DIR" -name 'postgres-*.sql.gz' -mtime "+$KEEP_DAYS" -delete
find "$BACKUP_DIR" -name 'minio-*.tar.gz'    -mtime "+$KEEP_DAYS" -delete

TOTAL=$(du -sh "$BACKUP_DIR" | cut -f1)
log "✅ Backup complete. Total backup dir size: $TOTAL"
log "   Location: $BACKUP_DIR"

# ============================================================
# Optional: ship the latest backup off-box
# Set BACKUP_REMOTE to one of:
#   s3://my-bucket/medguard360/    (requires aws CLI)
#   user@otherhost:/path/          (requires SSH keys)
# ============================================================
if [[ -n "${BACKUP_REMOTE:-}" ]]; then
  log "→ Shipping latest backup to $BACKUP_REMOTE..."
  if [[ "$BACKUP_REMOTE" == s3://* ]]; then
    aws s3 cp "$BACKUP_DIR/postgres-$TODAY.sql.gz" "$BACKUP_REMOTE"
    [[ -f "$BACKUP_DIR/minio-$TODAY.tar.gz" ]] && \
      aws s3 cp "$BACKUP_DIR/minio-$TODAY.tar.gz" "$BACKUP_REMOTE"
  else
    rsync -avz "$BACKUP_DIR/postgres-$TODAY.sql.gz" "$BACKUP_REMOTE"
    [[ -f "$BACKUP_DIR/minio-$TODAY.tar.gz" ]] && \
      rsync -avz "$BACKUP_DIR/minio-$TODAY.tar.gz" "$BACKUP_REMOTE"
  fi
  log "  ✓ Shipped off-box"
fi

# ============================================================
# Restore instructions (so you can find them when you need them)
# ============================================================
if ! (( QUIET )); then
cat <<EOF

To restore from one of these backups:

  # Pick a backup file:
  ls -lah $BACKUP_DIR

  # Restore Postgres:
  gunzip -c $BACKUP_DIR/postgres-YYYY-MM-DD_HHMMSS.sql.gz | \\
    docker compose -f $COMPOSE exec -T postgres \\
    psql -U ${PG_USER:-medguard} -d ${PG_DATABASE:-medguard360}

  # Restore MinIO:
  docker compose -f $COMPOSE stop minio
  rm -rf ./data/minio
  tar -xzf $BACKUP_DIR/minio-YYYY-MM-DD_HHMMSS.tar.gz -C ./data
  docker compose -f $COMPOSE start minio

EOF
fi
