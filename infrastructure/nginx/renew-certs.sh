#!/usr/bin/env bash
# MedGuard360 — Let's Encrypt cert renewal helper.
# Run via cron daily (certbot handles internal cadence; this just makes sure
# nginx reloads when a cert is renewed).

set -euo pipefail

LOG=/var/log/medguard360/cert-renewal.log
CERTBOT=/usr/bin/certbot
NGINX=/usr/sbin/nginx
DOMAINS=(api.medguard360.com portal.medguard360.com hub.medguard360.com)

mkdir -p /var/log/medguard360
echo "$(date -Iseconds) renewal check starting" >> "$LOG"

# Try to renew every cert. --quiet exits 0 even if nothing renews.
$CERTBOT renew \
  --webroot --webroot-path /var/www/letsencrypt \
  --post-hook "$NGINX -s reload" \
  --quiet >> "$LOG" 2>&1

# Sanity check: any cert expiring in < 14 days that didn't get renewed?
for d in "${DOMAINS[@]}"; do
  cert="/etc/letsencrypt/live/$d/fullchain.pem"
  if [[ -f "$cert" ]]; then
    expiry=$(openssl x509 -in "$cert" -enddate -noout | cut -d= -f2)
    expiry_epoch=$(date -d "$expiry" +%s)
    now_epoch=$(date +%s)
    days_left=$(( (expiry_epoch - now_epoch) / 86400 ))
    if (( days_left < 14 )); then
      echo "$(date -Iseconds) WARN: $d cert expires in $days_left days" >> "$LOG"
      # Notify ops via mail
      mail -s "[MedGuard360 cert] $d expires in $days_left days" info@geniuseye.ai < "$LOG" || true
    fi
  fi
done

echo "$(date -Iseconds) renewal check done" >> "$LOG"
