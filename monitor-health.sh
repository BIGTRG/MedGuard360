#!/bin/bash

# Monitor MedGuard360 health every 60 seconds
# Restart if portal is down

while true; do
  # Check portal
  if ! curl -s -m 5 http://localhost:8090 >/dev/null 2>&1; then
    echo "[$(date)] Portal down! Restarting..."
    cd /opt/medguard360
    docker compose restart nginx 2>&1 | tail -1
    sleep 30
  fi

  # Check gateway
  if ! curl -s -m 5 http://localhost:3999/health >/dev/null 2>&1; then
    echo "[$(date)] Gateway down! Restarting..."
    pm2 restart gateway 2>&1 | tail -1
    sleep 30
  fi

  sleep 60
done
