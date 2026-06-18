-- Member portal: patients may read their own claims (patients.id = users.id in demo).
DROP POLICY IF EXISTS claims_read ON claims;
CREATE POLICY claims_read ON claims FOR SELECT USING (
  app_role_is_cross_state()
  OR (app_current_role() IN ('state_medicaid_agency','mco_admin','billing_manager',
                              'compliance_officer','fraud_investigator','denial_appeals_specialist')
      AND state_code = app_current_state_code())
  OR billing_provider_id = app_current_user_id()
  OR rendering_provider_id = app_current_user_id()
  OR (app_current_role() = 'patient' AND patient_id = app_current_user_id())
);