#!/usr/bin/env bash
# Apply migrations 0025-0031 (HETS, Community Engagement, Drug PA, EHR core,
# EHR specialty, MA Directory, D-SNP). Idempotent: every migration uses
# CREATE TABLE IF NOT EXISTS / ON CONFLICT etc.
set -euo pipefail
cd "$(dirname "$0")/.."

for m in \
  infrastructure/postgres/migrations/0025_hets_enrollment.sql \
  infrastructure/postgres/migrations/0026_community_engagement.sql \
  infrastructure/postgres/migrations/0027_drug_pa.sql \
  infrastructure/postgres/migrations/0028_ehr_core.sql \
  infrastructure/postgres/migrations/0029_ehr_specialty.sql \
  infrastructure/postgres/migrations/0030_ma_directory.sql \
  infrastructure/postgres/migrations/0031_dsnp_dual_eligible.sql; do
  echo "================ $(basename "$m") ================"
  docker exec -i medguard360-postgres-1 psql -U medguard -d medguard360 < "$m" 2>&1 | tail -10
  echo ""
done
echo "Done. Counts:"
docker exec -i medguard360-postgres-1 psql -U medguard -d medguard360 -c "
  SELECT 'hets_enrollments' AS table, COUNT(*) FROM hets_enrollments
  UNION ALL SELECT 'community_engagement_records', COUNT(*) FROM community_engagement_records
  UNION ALL SELECT 'drug_formulary',               COUNT(*) FROM drug_formulary
  UNION ALL SELECT 'ehr_cds_rules',                COUNT(*) FROM ehr_cds_rules;
"
