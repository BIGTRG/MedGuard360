#!/bin/bash
cd /opt/medguard360/infrastructure/postgres/migrations

MIGRATIONS=(
  "0035_notification_templates_overnight_updates.sql"
  "0036_nc_county_lme_routing.sql"
  "0037_evv_tables.sql"
  "0038_service_verification_tables.sql"
  "0039_fraud_detection_tables.sql"
  "0040_ehr_tables.sql"
  "0041_physical_health_billing_tables.sql"
  "0042_cms_compliance_tables.sql"
  "0043_credentialing_tables.sql"
  "0044_nemt_ems_tables.sql"
  "0045_epic_hub_cfsp_tables.sql"
)

APPLIED=0
FAILED=0

for migration in "${MIGRATIONS[@]}"; do
  echo -n "  ▪ $migration ... "
  
  # Run migration in Docker container
  if PGPASSWORD='demo-password-not-for-prod' docker exec medguard360-postgres-1 psql -U medguard -d medguard360 -f "/var/lib/postgresql/data/migrations/$migration" > /tmp/migration_${migration}.log 2>&1; then
    echo "✅"
    ((APPLIED++))
  else
    echo "❌"
    echo "    Error: $(head -1 /tmp/migration_${migration}.log)"
    ((FAILED++))
  fi
done

echo ""
echo "=== MIGRATION SUMMARY ==="
echo "✅ Applied: $APPLIED/11"
if [ $FAILED -gt 0 ]; then
  echo "❌ Failed:  $FAILED/11"
fi
