-- Restore the final claims_read policy after 0035 added patient self-read.
-- claims.billing_provider_id/rendering_provider_id reference providers.id,
-- while authenticated provider users are identified by users.id.

DROP POLICY IF EXISTS claims_read ON claims;
CREATE POLICY claims_read ON claims FOR SELECT USING (
  app_role_is_cross_state()
  OR (app_current_role() IN ('state_medicaid_agency','mco_admin','billing_manager',
                              'compliance_officer','fraud_investigator','denial_appeals_specialist')
      AND state_code = app_current_state_code())
  OR billing_provider_id IN (SELECT id FROM providers WHERE user_id = app_current_user_id())
  OR rendering_provider_id IN (SELECT id FROM providers WHERE user_id = app_current_user_id())
  OR (app_current_role() = 'patient' AND patient_id = app_current_user_id())
);
